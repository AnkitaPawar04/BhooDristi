def BhooDristi_predict(district):

    import pandas as pd
    import numpy as np
    from datetime import datetime

    district = district.lower().strip()

    # ----------------------------
    # 1️⃣ Detect Season
    # ----------------------------
    month = datetime.now().month

    if month in [6,7,8,9,10]:
        season = "Kharif"
    elif month in [11,12,1,2,3]:
        season = "Rabi"
    else:
        season = "Zaid"


    # ----------------------------
    # 2️⃣ Get Coordinates
    # ----------------------------
    row = geo_df[geo_df["District"] == district]

    if row.empty:
        return {"Error": "District not found in geo dataset"}

    lat = row.iloc[0]["Latitude"]
    lon = row.iloc[0]["Longitude"]


    # ----------------------------
    # 3️⃣ Get Weather
    # ----------------------------
    temperature, humidity, rainfall = get_weather(lat, lon)


    # ----------------------------
    # 4️⃣ Get Soil Data
    # ----------------------------
    soil_row = district_soil[district_soil["District"] == district]

    if soil_row.empty:
        return {"Error": "District not found in soil dataset"}

    N = soil_row.iloc[0]["N"]
    P = soil_row.iloc[0]["P"]
    K = soil_row.iloc[0]["K"]
    ph = soil_row.iloc[0]["ph"]


    # ----------------------------
    # 5️⃣ Model Input
    # ----------------------------
    input_data = pd.DataFrame(
        [[N, P, K, temperature, humidity, ph, rainfall]],
        columns=["N","P","K","temperature","humidity","ph","rainfall"]
    )


    # ----------------------------
    # 6️⃣ Prediction
    # ----------------------------
    probs = model.predict_proba(input_data)[0]
    prediction = model.predict(input_data)[0]


    # ----------------------------
    # 7️⃣ Top 3 Crops
    # ----------------------------
    top_indices = np.argsort(probs)[-3:][::-1]

    top_crops = []

    for i in top_indices:
        top_crops.append({
            "Crop": label_encoder.classes_[i],
            "Confidence (%)": float(round(probs[i]*100,2))
        })


    # ----------------------------
    # 8️⃣ SHAP Explainability
    # ----------------------------
    shap_values = explainer.shap_values(input_data)

    class_index = list(model.classes_).index(prediction)

    # Correct SHAP extraction
    shap_contrib = shap_values[0][:, class_index]

    features = input_data.columns

    shap_df = pd.DataFrame({
        "Feature": features,
        "Impact": shap_contrib
    })

    shap_df = shap_df.reindex(
        shap_df.Impact.abs().sort_values(ascending=False).index
    )

    top_features = shap_df.head(3)


    # ----------------------------
    # 9️⃣ Farmer Friendly Explanation
    # ----------------------------
    feature_names = {
        "N":"Nitrogen levels",
        "P":"Phosphorus levels",
        "K":"Potassium levels",
        "temperature":"Temperature conditions",
        "humidity":"Humidity levels",
        "ph":"Soil pH",
        "rainfall":"Rainfall availability"
    }

    explanations = []

    for _, row in top_features.iterrows():

        feature = row["Feature"]

        explanations.append(
            f"{feature_names.get(feature, feature)} strongly influenced the crop recommendation."
        )


    # ----------------------------
    # 🔟 Final Output
    # ----------------------------
    return {

        "District": district.title(),

        "Detected Season": season,

        "Recommended Crop": prediction,

        "Confidence (%)": float(round(max(probs)*100,2)),

        "Top 3 Crops": top_crops,

        "Model Explanation": explanations
    }