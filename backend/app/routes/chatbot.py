from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from groq import Groq
from dotenv import load_dotenv
from typing import Optional
import os
import base64
import re

from ..utils.location import get_district_from_coordinates
from ..utils.soil_database import get_soil_data
from .crop import get_weather_data
from .weather import get_forecast


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError("GROQ_API_KEY is not configured")

client = Groq(api_key=api_key)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="",
    tags=["farmer chatbot"]
)


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str

    conversation: list[ChatMessage] = Field(
        default_factory=list
    )

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None


class ChatResponse(BaseModel):
    response: str


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(text: str) -> str:

    text = text.strip()

    if not text:
        return "English"

    devanagari_count = sum(
        1
        for char in text
        if "\u0900" <= char <= "\u097F"
    )

    latin_count = sum(
        1
        for char in text
        if char.isascii() and char.isalpha()
    )

    if devanagari_count > latin_count:

        marathi_words = [
            "मी",
            "माझे",
            "माझ्या",
            "मला",
            "तुम्ही",
            "तुमच्या",
            "शेत",
            "शेती",
            "पीक",
            "पिके",
            "काय",
            "कुठे",
            "आहे",
            "आहेत",
            "करावे",
            "करायचे",
            "पाणी",
            "जमीन",
            "माती",
            "हंगाम",
            "खरीप",
            "रब्बी",
        ]

        hindi_words = [
            "मैं",
            "मेरा",
            "मेरे",
            "मुझे",
            "आप",
            "आपका",
            "आपके",
            "खेत",
            "खेती",
            "फसल",
            "फसलें",
            "क्या",
            "कहां",
            "है",
            "हैं",
            "करना",
            "पानी",
            "जमीन",
            "मिट्टी",
            "मौसम",
        ]

        marathi_score = sum(
            1
            for word in marathi_words
            if word in text
        )

        hindi_score = sum(
            1
            for word in hindi_words
            if word in text
        )

        if marathi_score > hindi_score:
            return "Marathi"

        return "Hindi"

    return "English"


# ============================================================
# CLEAN AI RESPONSE
# ============================================================

def clean_ai_response(text: str) -> str:

    if not text:
        return ""

    text = re.sub(
        r"<think>.*?</think>",
        "",
        text,
        flags=re.DOTALL | re.IGNORECASE
    )

    text = re.sub(
        r"</?think>",
        "",
        text,
        flags=re.IGNORECASE
    )

    return text.strip()


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are AgroSahyadri Farmer Assistant, a helpful AI assistant
for farmers in Maharashtra.

You are a GENERAL agricultural assistant.

You can answer questions about:

- Crops
- Crop selection
- Farming practices
- Soil
- Fertilizers
- Irrigation
- Water management
- Weather
- Crop diseases
- Crop pests
- Insects
- Plant symptoms
- Seeds
- Sowing
- Harvesting
- Fertilizer application
- Pesticides and agricultural products
- Farm equipment
- Government agriculture schemes
- General farming questions
- Agriculture-related images
- General questions related to farming

============================================================
LANGUAGE RULE
============================================================

The response language MUST match the CURRENT USER MESSAGE.

English question:
Respond entirely in English.

Hindi question:
Respond entirely in Hindi.

Marathi question:
Respond entirely in Marathi.

Mixed-language question:
Respond naturally in the same mixed style.

The current user message has higher priority than previous
conversation and location.

============================================================
GENERAL CHAT RULE
============================================================

Do NOT assume that every question is about crop disease.

Answer the actual question asked by the farmer.

For example:

If the farmer asks:
"What fertilizer is good for cotton?"

Answer the fertilizer question.

If the farmer asks:
"Will it rain tomorrow?"

Answer using available weather information.

If the farmer asks:
"What is NPK?"

Explain NPK.

If the farmer asks:
"Can I grow onion in this soil?"

Discuss onion suitability using available soil information.

If the farmer asks:
"What is this pesticide?"

Explain the pesticide.

If the farmer asks a general farming question,
answer it normally.

Do not force unrelated crop-disease information into the response.

============================================================
AGRICULTURAL CONTEXT
============================================================

When reliable information is available:

- Use farmer location.
- Use soil information.
- Use weather information.
- Consider crop and season.
- Consider irrigation availability.
- Give practical farmer-friendly advice.

Never invent:

- Soil values
- Weather values
- Rainfall
- Location
- Crop conditions

Clearly distinguish known information from assumptions.

============================================================
CROP RECOMMENDATIONS
============================================================

When recommending crops, consider:

- Location
- Soil
- Season
- Weather
- Water availability

Explain:

- Recommended crop
- Why it is suitable
- Important conditions
- Water requirement
- Important cautions

============================================================
SAFETY
============================================================

For pesticides, fertilizers and agricultural chemicals:

- Do not invent product label instructions.
- Do not invent dosage.
- Do not encourage unsafe mixing.
- Recommend following the product label.
- Recommend appropriate protective equipment.
- When necessary, advise consulting a local agricultural officer
  or qualified agricultural professional.

============================================================
IMAGE UNDERSTANDING
============================================================

When the farmer uploads an image, FIRST determine what is
actually visible.

The image may contain:

- Crop
- Leaf
- Fruit
- Flower
- Insect
- Pest
- Disease symptom
- Soil
- Fertilizer
- Pesticide bottle
- Seed packet
- Farm equipment
- Irrigation equipment
- Agricultural machinery
- Weather/environmental condition
- Other farming-related object
- Something unrelated to agriculture

DO NOT assume that every uploaded image is a crop leaf.

If the image is a crop or plant:

- Identify the crop if possible.
- Describe visible symptoms.
- Identify possible disease/pest/deficiency/stress.
- Give confidence.
- Explain the likely reason.
- Give practical next steps.
- Give prevention advice.

If the image is a pesticide or fertilizer product:

- Identify the product if readable.
- Identify visible active ingredients if clearly readable.
- Explain what the product appears to be used for.
- Do not invent dosage or label instructions.
- Tell the farmer to follow the product label.

If the image contains an insect:

- Identify the insect if possible.
- Explain whether it may be beneficial or harmful.
- If it appears harmful, explain possible crop damage.
- Give practical management suggestions.

If the image contains soil:

- Describe visible characteristics.
- Do not claim exact soil chemistry from an image.
- Explain what additional soil testing may be useful.

If the image contains farming equipment:

- Identify it if possible.
- Explain its likely purpose.
- Mention important safety considerations when relevant.

If the image is unrelated to farming:

- Clearly say what appears to be visible.
- Answer the farmer's question about the image if possible.
- Do not pretend it is a crop.

Never invent objects, symptoms, diseases or labels that are not
reasonably visible.

============================================================
UNCERTAINTY
============================================================

Image identification is not always certain.

Use:

High confidence:
When the object/symptom is clearly visible.

Medium confidence:
When the appearance strongly suggests something but alternatives
exist.

Low confidence:
When the image is unclear or multiple possibilities exist.

Never claim certainty when the image does not support it.

============================================================
RESPONSE STYLE
============================================================

Be:

- Helpful
- Practical
- Clear
- Farmer-friendly
- Concise but informative

Do not expose internal reasoning.

Do not output <think> tags.
"""


# ============================================================
# GENERAL IMAGE ANALYSIS
# ============================================================

@router.post("/image")
async def upload_crop_image(
    file: UploadFile = File(...)
):

    print("\n")
    print("📷📷📷 IMAGE ANALYSIS ENDPOINT CALLED 📷📷📷")
    print("FILE:", file.filename)
    print("CONTENT TYPE:", file.content_type)

    try:

        # ----------------------------------------------------
        # Validate content type
        # ----------------------------------------------------

        if not file.content_type:

            raise HTTPException(
                status_code=400,
                detail="Image content type is missing."
            )

        allowed_types = {
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        }

        content_type = file.content_type.lower()

        if content_type not in allowed_types:

            raise HTTPException(
                status_code=400,
                detail="Supported formats are JPG, JPEG, PNG and WEBP."
            )

        # ----------------------------------------------------
        # Read image
        # ----------------------------------------------------

        image_data = await file.read()

        if not image_data:

            raise HTTPException(
                status_code=400,
                detail="Image file is empty."
            )

        print(
            "IMAGE SIZE:",
            len(image_data),
            "bytes"
        )

        # ----------------------------------------------------
        # Size limit
        # ----------------------------------------------------

        if len(image_data) > 20 * 1024 * 1024:

            raise HTTPException(
                status_code=400,
                detail="Image must be smaller than 20 MB."
            )

        # ----------------------------------------------------
        # Base64
        # ----------------------------------------------------

        encoded_image = base64.b64encode(
            image_data
        ).decode("utf-8")

        image_url = (
            f"data:{content_type};base64,{encoded_image}"
        )

        print("✅ Image converted to base64")

        # ----------------------------------------------------
        # GENERAL VISION PROMPT
        # ----------------------------------------------------

        prompt = """
Analyze this uploaded image carefully.

IMPORTANT:
Do NOT assume this is a crop leaf.

First determine what is actually visible in the image.

Possible categories include:

1. Crop or plant
2. Leaf
3. Fruit or vegetable
4. Flower
5. Insect or pest
6. Plant disease symptom
7. Soil
8. Fertilizer
9. Pesticide or agricultural chemical
10. Seed packet
11. Farm equipment
12. Irrigation equipment
13. Agricultural machinery
14. Weather/environmental condition
15. Other object

Then answer appropriately based on what is actually visible.

If it is a crop/plant:
- Identify the crop if possible.
- Describe visible symptoms.
- Give likely disease, pest, deficiency or stress.
- Give alternatives when appropriate.
- Give confidence.
- Give practical next steps.
- Give prevention advice.

If it is a pesticide/fertilizer:
- Identify the product/name if readable.
- Identify active ingredients only if clearly visible.
- Explain what the product appears to be used for.
- Do not invent dosage.
- Do not invent label instructions.
- Tell the user to follow the product label.

If it is an insect:
- Identify it if possible.
- Explain whether it may be harmful or beneficial.
- Explain likely crop damage if applicable.

If it is soil:
- Describe visible characteristics.
- Do not claim exact NPK, pH or other chemistry from an image.

If it is farm equipment:
- Identify it if possible.
- Explain its purpose.

If it is unrelated to agriculture:
- Clearly identify what is visible.
- Answer questions about it if possible.

Never force an image into a crop-disease diagnosis.

Never invent information that cannot reasonably be seen.

Do not expose internal reasoning.

Do not output <think> tags.

Answer in English.

Use a format appropriate to the image.

For a crop/plant image, use:

🌱 Crop:
...

🔍 Visible symptoms:
...

🦠 Possible issue:
...

📊 Confidence:
...

💡 What you should do:
...

🛡️ Prevention:
...

For other image types, use a natural format appropriate to
what is shown.
"""

        # ----------------------------------------------------
        # Groq Vision
        # ----------------------------------------------------

        print("🤖 Sending image to Groq Vision...")

        completion = client.chat.completions.create(

            model="qwen/qwen3.6-27b",

            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        }
                    ]
                }
            ],

            temperature=0.3,

            max_completion_tokens=1200,

            stream=False
        )

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        raw_analysis = (
            completion
            .choices[0]
            .message
            .content
        )

        if not raw_analysis:

            raise Exception(
                "Vision model returned an empty response."
            )

        print("----------------------------------------")
        print("RAW VISION RESPONSE:")
        print(raw_analysis)
        print("----------------------------------------")

        analysis = clean_ai_response(
            raw_analysis
        )

        if not analysis:

            raise Exception(
                "Vision model returned an empty response."
            )

        print("----------------------------------------")
        print("CLEAN VISION RESPONSE:")
        print(analysis)
        print("----------------------------------------")

        return {
            "message": "Image analyzed successfully",
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(image_data),
            "response": analysis
        }

    except HTTPException:
        raise

    except Exception as e:

        print("\n")
        print("❌❌❌ IMAGE ANALYSIS ERROR ❌❌❌")
        print("TYPE:", type(e).__name__)
        print("ERROR:", str(e))
        print("REPR:", repr(e))
        print("\n")

        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {str(e)}"
        )


# ============================================================
# AUDIO TRANSCRIPTION
# ============================================================

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = "mr"
):

    print("\n")
    print(
        "🎙️🎙️🎙️ AUDIO TRANSCRIPTION ENDPOINT CALLED 🎙️🎙️🎙️"
    )

    print("FILE:", file.filename)
    print("CONTENT TYPE:", file.content_type)
    print("LANGUAGE:", language)

    allowed_languages = {
        "mr": "Marathi",
        "hi": "Hindi",
        "en": "English"
    }

    if language not in allowed_languages:

        raise HTTPException(
            status_code=400,
            detail="Unsupported language. Use mr, hi, or en."
        )

    try:

        audio_data = await file.read()

        if not audio_data:

            raise HTTPException(
                status_code=400,
                detail="Audio file is empty"
            )

        if language == "mr":

            prompt = """
केळी, कापूस, सोयाबीन, ज्वारी, बाजरी, गहू, तूर,
ऊस, कांदा, टोमॅटो, मिरची, पीक, पिके, शेती,
शेतकरी, माती, जमीन, खत, फवारणी, सिंचन,
पाणी, रोग, कीड, पाऊस, हवामान, पानांवर डाग
"""

        elif language == "hi":

            prompt = """
केला, कपास, सोयाबीन, ज्वार, बाजरा, गेहूं, तूर,
गन्ना, प्याज, टमाटर, मिर्च, फसल, खेती,
किसान, मिट्टी, जमीन, खाद, छिड़काव, सिंचाई,
पानी, रोग, कीट, बारिश, मौसम, पत्तियों पर दाग
"""

        else:

            prompt = """
banana, cotton, soybean, sorghum, pearl millet, wheat,
pigeon pea, sugarcane, onion, tomato, chilli, crop,
farmer, farming, soil, fertilizer, spraying, irrigation,
water, disease, pest, rainfall, weather, leaf spots
"""

        transcription = client.audio.transcriptions.create(

            file=(
                file.filename or "farmer-question.webm",
                audio_data
            ),

            model="whisper-large-v3",

            language=language,

            prompt=prompt,

            temperature=0.0
        )

        text = transcription.text.strip()

        if not text:

            raise HTTPException(
                status_code=400,
                detail="Could not understand the audio"
            )

        print(
            "🎙️ TRANSCRIBED TEXT:",
            text
        )

        return {
            "text": text,
            "language": language
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "❌ AUDIO TRANSCRIPTION ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to transcribe audio right now."
        )


# ============================================================
# CHAT ENDPOINT
# ============================================================

@router.post(
    "/chat",
    response_model=ChatResponse
)
async def chat(request: ChatRequest):

    print("\n")
    print("🔥🔥🔥 CHATBOT ENDPOINT CALLED 🔥🔥🔥")

    print("MESSAGE:", request.message)
    print("LATITUDE:", request.latitude)
    print("LONGITUDE:", request.longitude)
    print("DISTRICT:", request.district)

    try:

        # ----------------------------------------------------
        # Validate
        # ----------------------------------------------------

        message = request.message.strip()

        if not message:

            raise HTTPException(
                status_code=400,
                detail="Message cannot be empty"
            )

        # ----------------------------------------------------
        # Language
        # ----------------------------------------------------

        current_language = detect_language(
            message
        )

        print(
            "CURRENT LANGUAGE:",
            current_language
        )

        # ----------------------------------------------------
        # Location
        # ----------------------------------------------------

        location_context = ""

        if (
            request.latitude is not None
            and request.longitude is not None
        ):

            location_context += f"""
Farmer GPS location:

Latitude: {request.latitude}
Longitude: {request.longitude}
"""

        if request.district:

            location_context += f"""
Farmer district:

{request.district}
"""

        # ----------------------------------------------------
        # Agricultural context
        # ----------------------------------------------------

        farmer_context = ""

        if (
            request.latitude is not None
            and request.longitude is not None
        ):

            try:

                district = get_district_from_coordinates(
                    request.latitude,
                    request.longitude
                )

                print(
                    "DISTRICT:",
                    district
                )

                soil_data = get_soil_data(
                    district
                )

                print(
                    "SOIL DATA:",
                    soil_data
                )

                weather_data = get_weather_data(
                    request.latitude,
                    request.longitude
                )

                forecast_data = await get_forecast(
                    request.latitude,
                    request.longitude
                )

                nitrogen = soil_data.get(
                    "nitrogen",
                    "Unknown"
                )

                phosphorus = soil_data.get(
                    "phosphorus",
                    "Unknown"
                )

                potassium = soil_data.get(
                    "potassium",
                    "Unknown"
                )

                ph = soil_data.get(
                    "ph",
                    "Unknown"
                )

                temperature = weather_data.get(
                    "temperature",
                    "Unknown"
                )

                humidity = weather_data.get(
                    "humidity",
                    "Unknown"
                )

                rainfall = weather_data.get(
                    "rainfall",
                    "Unknown"
                )

                farmer_context = f"""
============================================================
FARMER AGRICULTURAL CONTEXT
============================================================

District:
{district}

Soil Information:

Nitrogen: {nitrogen}
Phosphorus: {phosphorus}
Potassium: {potassium}
pH: {ph}

Current Weather:

Temperature: {temperature} °C
Humidity: {humidity} %
Rainfall: {rainfall} mm

5-DAY WEATHER FORECAST:

{forecast_data}

============================================================

Use these values only when relevant.

Do NOT invent different soil or weather values.

If the farmer asks about crop selection, consider the available
district, soil, weather and season information.
"""

            except Exception as e:

                print(
                    "⚠️ Could not get agricultural context:"
                )

                print(
                    repr(e)
                )

                farmer_context = """
No reliable agricultural soil/weather context
could be retrieved.

Do not invent soil or weather values.
"""

        else:

            farmer_context = """
No GPS-based agricultural context is available.

Do not invent location, soil or weather information.
"""

        # ----------------------------------------------------
        # Conversation history
        # ----------------------------------------------------

        recent_conversation = (
            request.conversation[-10:]
        )

        messages = [

            {
                "role": "system",
                "content": (
                    SYSTEM_PROMPT
                    + "\n\n"
                    + "CURRENT USER MESSAGE LANGUAGE: "
                    + current_language
                    + "\n\n"
                    + farmer_context
                    + "\n\n"
                    + location_context
                )
            }

        ]

        for msg in recent_conversation:

            if msg.role in [
                "user",
                "assistant"
            ]:

                messages.append(
                    {
                        "role": msg.role,
                        "content": msg.content
                    }
                )

        # ----------------------------------------------------
        # Current message
        # ----------------------------------------------------

        language_instruction = ""

        if current_language == "English":

            language_instruction = """
Respond entirely in English.
Do not use Hindi or Marathi.
Do not use Devanagari script.
"""

        elif current_language == "Hindi":

            language_instruction = """
Respond entirely in Hindi.
"""

        elif current_language == "Marathi":

            language_instruction = """
Respond entirely in Marathi.
"""

        messages.append(
            {
                "role": "user",
                "content": f"""
CURRENT USER MESSAGE:

{message}

{language_instruction}

Answer the user's actual question.

Do not assume that the user is asking about crop disease
unless the question actually concerns crop disease.
"""
            }
        )

        # ----------------------------------------------------
        # Groq
        # ----------------------------------------------------

        print("----------------------------------------")
        print("SENDING REQUEST TO GROQ")
        print("LANGUAGE:", current_language)
        print("MESSAGE:", message)
        print("----------------------------------------")

        completion = client.chat.completions.create(

            model="openai/gpt-oss-20b",

            messages=messages,

            temperature=0.2,

            max_tokens=700
        )

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        response = (
            completion
            .choices[0]
            .message
            .content
        )

        if not response:

            raise Exception(
                "Empty response received from Groq"
            )

        response = clean_ai_response(
            response.strip()
        )

        # ----------------------------------------------------
        # English safety check
        # ----------------------------------------------------

        if current_language == "English":

            devanagari_count = sum(
                1
                for char in response
                if "\u0900" <= char <= "\u097F"
            )

            if devanagari_count > 5:

                print(
                    "⚠️ English response contained Devanagari."
                )

                correction_messages = [

                    {
                        "role": "system",
                        "content": """
Rewrite the response entirely in English.

Rules:

- English only.
- No Hindi.
- No Marathi.
- No Devanagari characters.
- Preserve the original meaning.
- Do not add unrelated information.
- Do not expose internal reasoning.
"""
                    },

                    {
                        "role": "user",
                        "content": response
                    }

                ]

                corrected = client.chat.completions.create(

                    model="openai/gpt-oss-20b",

                    messages=correction_messages,

                    temperature=0.1,

                    max_tokens=700
                )

                corrected_response = (
                    corrected
                    .choices[0]
                    .message
                    .content
                )

                if corrected_response:

                    response = clean_ai_response(
                        corrected_response.strip()
                    )

        print("----------------------------------------")
        print("CHATBOT RESPONSE:")
        print(response)
        print("----------------------------------------")

        return {
            "response": response
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "❌ CHATBOT ERROR:"
        )

        print(
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to process your request right now."
        )