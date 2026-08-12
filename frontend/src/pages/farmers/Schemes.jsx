import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useApp } from "../../contexts/AppContext";
import { getTranslation } from "../../utils/i18n";
import dashboardBgVideo from "./videos/dashboard.mp4";

const PAGE_SIZE = 2;
const SCHEMES_JSON_URL = "/data/maharashtra_agriculture_schemes.json";

const GOVERNMENT_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "Central", label: "Central" },
	{ value: "State", label: "State" },
];

const CATEGORY_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "Income Support", label: "Income Support" },
	{ value: "Crop Insurance", label: "Crop Insurance" },
	{ value: "Irrigation", label: "Irrigation" },
	{ value: "Soil Health", label: "Soil Health" },
	{ value: "Organic Farming", label: "Organic Farming" },
	{ value: "Seeds", label: "Seeds" },
	{ value: "Farm Mechanization", label: "Farm Mechanization" },
	{ value: "Horticulture", label: "Horticulture" },
	{ value: "Agriculture Credit", label: "Agriculture Credit" },
	{ value: "Agricultural Marketing", label: "Agricultural Marketing" },
	{ value: "Plant Protection", label: "Plant Protection" },
	{ value: "Water Conservation", label: "Water Conservation" },
];

const CATEGORY_KEYWORDS = {
	"Income Support": [
		"income support",
		"direct income support",
		"cash support",
		"loan waiver",
		"credit",
	],
	"Crop Insurance": ["insurance", "crop insurance"],
	Irrigation: [
		"irrigation",
		"water infrastructure",
		"water conservation",
		"farm pond",
		"water storage",
		"well",
		"dam",
		"channel",
		"recharge",
		"pipeline",
	],
	"Soil Health": ["soil health", "soil"],
	"Organic Farming": [
		"organic",
		"bio-farming",
		"sustainable bio-farming",
	],
	Seeds: ["seed"],
	"Farm Mechanization": [
		"mechanization",
		"machinery",
		"agri-machinery",
	],
	Horticulture: ["horticulture", "protected farming"],
	"Agriculture Credit": [
		"credit",
		"loan",
		"bank",
		"agri-credit",
	],
	"Agricultural Marketing": ["marketing", "market"],
	"Plant Protection": [
		"plant protection",
		"pest",
		"disease",
	],
	"Water Conservation": [
		"water conservation",
		"recharge",
		"check dam",
		"jalyukt",
		"watershed",
	],
};

const normalize = (value) =>
	(value || "").toString().trim().toLowerCase();

const truncateText = (value, maxLength) => {
	const text = (value || "").toString().trim();

	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength).trimEnd()}...`;
};

const getVisiblePageNumbers = (currentPage, totalPages) => {
	if (totalPages <= 5) {
		return Array.from(
			{ length: totalPages },
			(_, index) => index + 1
		);
	}

	if (currentPage <= 3) {
		return [1, 2, 3, 4, 5, "ellipsis"];
	}

	if (currentPage >= totalPages - 2) {
		return [
			1,
			"ellipsis",
			totalPages - 4,
			totalPages - 3,
			totalPages - 2,
			totalPages - 1,
			totalPages,
		];
	}

	return [
		1,
		"ellipsis",
		currentPage - 1,
		currentPage,
		currentPage + 1,
		"ellipsis",
		totalPages,
	];
};

const getSchemeCategoryMatch = (
	schemeCategory,
	selectedCategory
) => {
	if (selectedCategory === "all") {
		return true;
	}

	const categoryText = normalize(schemeCategory);

	const keywords =
		CATEGORY_KEYWORDS[selectedCategory] ||
		[selectedCategory.toLowerCase()];

	return keywords.some((keyword) =>
		categoryText.includes(keyword)
	);
};

const getStatusStyles = (status) => {
	const normalizedStatus = normalize(status);

	if (normalizedStatus.includes("active")) {
		return "bg-green-100 text-green-700 border-green-200";
	}

	if (normalizedStatus.includes("upcoming")) {
		return "bg-yellow-100 text-yellow-700 border-yellow-200";
	}

	return "bg-gray-100 text-gray-700 border-gray-200";
};

const getCategoryLabel = (schemeCategory) => {
	const categoryText = normalize(schemeCategory);

	const match = CATEGORY_OPTIONS.find(
		({ value }) =>
			value !== "all" &&
			getSchemeCategoryMatch(
				categoryText,
				value
			)
	);

	return (
		match?.label ||
		schemeCategory ||
		"Not Available"
	);
};

const SkeletonCard = () => (
	<div className="rounded-2xl border-2 border-gray-200 p-5 animate-pulse">
		<div className="h-5 w-3/4 rounded bg-gray-200" />

		<div className="mt-3 flex flex-wrap gap-2">
			<div className="h-6 w-20 rounded-full bg-gray-200" />
			<div className="h-6 w-24 rounded-full bg-gray-200" />
		</div>

		<div className="mt-4 space-y-3">
			<div className="h-3 w-full rounded bg-gray-200" />
			<div className="h-3 w-11/12 rounded bg-gray-200" />
			<div className="h-3 w-10/12 rounded bg-gray-200" />
		</div>

		<div className="mt-5 flex gap-3">
			<div className="h-10 flex-1 rounded-xl bg-gray-200" />
			<div className="h-10 flex-1 rounded-xl bg-gray-200" />
		</div>
	</div>
);

const Schemes = ({ onNavigate }) => {
	const { language } = useApp();
	const [schemes, setSchemes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [governmentFilter, setGovernmentFilter] =
		useState("all");
	const [categoryFilter, setCategoryFilter] =
		useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedScheme, setSelectedScheme] =
		useState(null);

	useEffect(() => {
		let isMounted = true;

		const loadSchemes = async () => {
			try {
				setLoading(true);

				const response = await fetch(
					SCHEMES_JSON_URL
				);

				if (!response.ok) {
					throw new Error(
						`Failed to load schemes: ${response.status}`
					);
				}

				const payload = await response.json();

				const items = Object.values(payload)
					.map((scheme) => ({
						scheme_id:
							scheme.scheme_id || "",
						scheme_name:
							scheme.scheme_name ||
							"Not Available",
						category:
							scheme.category ||
							"Not Available",
						government:
							scheme.government ||
							"Not Available",
						department:
							scheme.department ||
							"Not Available",
						description:
							scheme.description ||
							"Not Available",
						beneficiary:
							scheme.beneficiary ||
							"Not Available",
						eligibility:
							scheme.eligibility ||
							"Not Available",
						benefits:
							scheme.benefits ||
							"Not Available",
						required_documents:
							scheme.required_documents ||
							"Not Available",
						application_mode:
							scheme.application_mode ||
							"Not Available",
						official_link:
							scheme.official_link || "",
						status:
							scheme.status ||
							"Not Available",
					}))
					.sort((a, b) =>
						a.scheme_id.localeCompare(
							b.scheme_id,
							undefined,
							{
								numeric: true,
							}
						)
					);

				if (isMounted) {
					setSchemes(items);
				}
			} catch (error) {
				console.error(error);

				if (isMounted) {
					setSchemes([]);
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadSchemes();

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		setCurrentPage(1);
	}, [
		searchQuery,
		governmentFilter,
		categoryFilter,
	]);

	const filteredSchemes = useMemo(() => {
		const query = normalize(searchQuery);

		return schemes.filter((scheme) => {
			const matchesSearch =
				!query ||
				[
					scheme.scheme_name,
					scheme.category,
					scheme.description,
					scheme.beneficiary,
					scheme.department,
				]
					.join(" ")
					.toLowerCase()
					.includes(query);

			const matchesGovernment =
				governmentFilter === "all" ||
				normalize(scheme.government) ===
					normalize(governmentFilter);

			const matchesCategory =
				getSchemeCategoryMatch(
					scheme.category,
					categoryFilter
				);

			return (
				matchesSearch &&
				matchesGovernment &&
				matchesCategory
			);
		});
	}, [
		schemes,
		searchQuery,
		governmentFilter,
		categoryFilter,
	]);

	const totalPages = Math.max(
		1,
		Math.ceil(
			filteredSchemes.length / PAGE_SIZE
		)
	);

	useEffect(() => {
		setCurrentPage((page) =>
			Math.min(page, totalPages)
		);
	}, [totalPages]);

	const paginatedSchemes = useMemo(() => {
		const startIndex =
			(currentPage - 1) * PAGE_SIZE;

		return filteredSchemes.slice(
			startIndex,
			startIndex + PAGE_SIZE
		);
	}, [filteredSchemes, currentPage]);

	const handleOpenWebsite = (url) => {
		if (!url) {
			return;
		}

		window.open(
			url,
			"_blank",
			"noopener,noreferrer"
		);
	};

	return (
		<div className="flex h-screen bg-transparent dark:bg-transparent">

			{/* Sidebar */}
			<Sidebar
				currentPage="government-schemes"
				onNavigate={onNavigate}
			/>

			{/* Main Area */}
			<div className="flex-1 flex flex-col overflow-hidden relative farm-dashboard">

				{/* Background Video */}
				<video
					autoPlay
					loop
					muted
					playsInline
					className="absolute inset-0 w-full h-full object-cover"
					ref={(video) => {
						if (video) {
							video.playbackRate = 0.5;
						}
					}}
				>
					<source
						src={dashboardBgVideo}
						type="video/mp4"
					/>
				</video>

				{/* Scrollable Page Content */}
				<div className="relative z-10 flex-1 overflow-y-auto">

					<div className="dashboard-content">

						<div className="p-8">

							{/* Page Header */}
							<div className="page-header animate-fadeInUp">

								<h1 className="page-title">
									Government Agriculture Schemes
								</h1>

								<p className="page-subtitle">
									Explore Central and Maharashtra
									Government Agriculture Schemes
								</p>

								<div className="page-divider"></div>

							</div>

							{/* Main Grid */}
							<div
								className="grid grid-cols-1 xl:grid-cols-[1fr_1.15fr] gap-6 mb-6 animate-fadeInUp"
								style={{
									animationDelay: "0.1s",
								}}
							>

								{/* Search and Filters */}
								<div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-emerald-200 dark:border-emerald-700 overflow-hidden">

									<div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white">

										<h2 className="text-2xl font-bold">
											Search and Filters
										</h2>

										<p className="text-emerald-100 mt-1 text-sm">
											Search schemes instantly
											and refine them by
											government or category.
										</p>

									</div>

									<div className="p-5 space-y-5">

										{/* Search */}
										<label className="flex flex-col gap-2">

											<span className="font-semibold">
												Search Schemes
											</span>

											<input
												type="text"
												value={searchQuery}
												onChange={(event) =>
													setSearchQuery(
														event.target
															.value
													)
												}
												placeholder="Search by scheme name, category, description, or beneficiary"
												className="border rounded-xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
											/>

										</label>

										{/* Government */}
										<label className="flex flex-col gap-2">

											<span className="font-semibold">
												Government
											</span>

											<select
												value={
													governmentFilter
												}
												onChange={(event) =>
													setGovernmentFilter(
														event.target
															.value
													)
												}
												className="border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
											>

												{GOVERNMENT_OPTIONS.map(
													(option) => (
														<option
															key={
																option.value
															}
															value={
																option.value
															}
														>
															{
																option.label
															}
														</option>
													)
												)}

											</select>

										</label>

										{/* Category */}
										<label className="flex flex-col gap-2">

											<span className="font-semibold">
												Category
											</span>

											<select
												value={
													categoryFilter
												}
												onChange={(event) =>
													setCategoryFilter(
														event.target
															.value
													)
												}
												className="border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
											>

												{CATEGORY_OPTIONS.map(
													(option) => (
														<option
															key={
																option.value
															}
															value={
																option.value
															}
														>
															{
																option.label
															}
														</option>
													)
												)}

											</select>

										</label>

										{/* Statistics */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

											<div className="bg-emerald-50 rounded-xl border p-4">

												<p className="text-sm">
													Total Schemes
												</p>

												<h2 className="text-3xl font-bold text-emerald-700">
													{
														schemes.length
													}
												</h2>

											</div>

											<div className="bg-blue-50 rounded-xl border p-4">

												<p className="text-sm">
													Filtered Schemes
												</p>

												<h2 className="text-3xl font-bold text-blue-700">
													{
														filteredSchemes.length
													}
												</h2>

											</div>

										</div>

										{/* Page Info */}
										<div className="rounded-xl bg-emerald-50 p-4 border">

											<p className="text-sm font-semibold">
												Current Page
											</p>

											<h3 className="font-bold text-lg mt-1">
												{currentPage} of{" "}
												{totalPages}
											</h3>

											<p className="text-xs mt-2 uppercase text-gray-600">
												Showing up to{" "}
												{PAGE_SIZE} schemes
												per page
											</p>

										</div>

									</div>

								</div>

								{/* Government Schemes */}
								<div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-blue-200 dark:border-blue-700 overflow-hidden">

									<div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">

										<h2 className="text-2xl font-bold">
											{getTranslation(language, 'governmentSchemes')}
										</h2>

										<p className="text-blue-100 mt-1 text-sm">
											Browse schemes, open
											details, or visit the
											official website.
										</p>

									</div>

									<div className="p-5 space-y-5 max-h-[760px] overflow-y-auto">

										{/* Loading */}
										{loading ? (

											<div className="space-y-4">

												{Array.from({
													length: 2,
												}).map(
													(_, index) => (
														<SkeletonCard
															key={
																index
															}
														/>
													)
												)}

											</div>

										) : paginatedSchemes.length ===
										  0 ? (

											/* No Results */
											<div className="rounded-2xl border-2 border-dashed border-emerald-300 p-8 text-center">

												<h3 className="text-xl font-bold">
													No Government
													Schemes Found
												</h3>

												<p className="text-gray-600 mt-2">
													Try adjusting the
													search query or
													filters.
												</p>

											</div>

										) : (

											<>
												{/* Scheme Cards */}
												<div className="space-y-4">

													{paginatedSchemes.map(
														(scheme) => (
															<div
																key={
																	scheme.scheme_id
																}
																className="w-full rounded-xl bg-white border shadow-md hover:shadow-lg transition-all duration-300 p-5"
															>

																<div className="flex items-start justify-between gap-3">

																	<h3 className="text-lg font-bold text-gray-900 leading-snug flex-1">
																		{
																			scheme.scheme_name
																		}
																	</h3>

																	<span
																		className={`shrink-0 border px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyles(
																			scheme.status
																		)}`}
																	>
																		{
																			scheme.status
																		}
																	</span>

																</div>

																<div className="mt-4 flex flex-wrap gap-2">

																	<span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
																		{getCategoryLabel(
																			scheme.category
																		)}
																	</span>

																	<span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs">
																		{
																			scheme.government
																		}
																	</span>

																</div>

																<div className="mt-4 space-y-3 text-sm text-gray-700">

																	<p className="leading-6">
																		<strong>
																			Department:
																		</strong>{" "}
																		{
																			scheme.department
																		}
																	</p>

																	<p className="leading-6">
																		<strong>
																			Beneficiary:
																		</strong>{" "}
																		{
																			scheme.beneficiary
																		}
																	</p>

																	<p
																		className="text-gray-600 leading-6"
																		style={{
																			display:
																				"-webkit-box",
																			WebkitLineClamp: 3,
																			WebkitBoxOrient:
																				"vertical",
																			overflow:
																				"hidden",
																		}}
																	>
																		<strong>
																			Description:
																		</strong>{" "}
																		{truncateText(
																			scheme.description,
																			120
																		)}
																	</p>

																</div>

																<div className="mt-5 flex flex-col sm:flex-row gap-3">

																	<button
																		onClick={() =>
																			setSelectedScheme(
																				scheme
																			)
																		}
																		className="flex-1 border rounded-xl py-2 hover:bg-gray-100 font-semibold transition-colors"
																	>
																		View
																		Details
																	</button>

																	<button
																		onClick={() =>
																			handleOpenWebsite(
																				scheme.official_link
																			)
																		}
																		disabled={
																			!scheme.official_link
																		}
																		className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:hover:bg-gray-300 text-white rounded-xl py-2 font-semibold transition-colors"
																	>
																		Official
																		Website
																	</button>

																</div>

															</div>
														)
													)}

												</div>

												{/* Pagination */}
												<div className="flex items-center justify-between gap-3 pt-2">

													<button
														onClick={() =>
															setCurrentPage(
																(page) =>
																	Math.max(
																		1,
																		page -
																			1
																	)
															)
														}
														disabled={
															currentPage ===
															1
														}
														className="border rounded-xl px-5 py-2 hover:bg-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
													>
														← Previous
													</button>

													<div className="flex items-center gap-2 flex-wrap justify-center">

														{getVisiblePageNumbers(
															currentPage,
															totalPages
														).map(
															(
																pageNumber,
																index
															) =>
																pageNumber ===
																"ellipsis" ? (
																	<span
																		key={`ellipsis-${index}`}
																		className="px-2 text-gray-500"
																	>
																		...
																	</span>
																) : (
																	<button
																		key={
																			pageNumber
																		}
																		onClick={() =>
																			setCurrentPage(
																				pageNumber
																			)
																		}
																		className={`h-10 w-10 rounded-xl border font-semibold transition-colors ${
																			currentPage ===
																			pageNumber
																				? "bg-emerald-600 text-white border-emerald-600"
																				: "hover:bg-gray-100 border-gray-200"
																		}`}
																	>
																		{
																			pageNumber
																		}
																	</button>
																)
														)}

													</div>

													<button
														onClick={() =>
															setCurrentPage(
																(page) =>
																	Math.min(
																		totalPages,
																		page +
																			1
																	)
															)
														}
														disabled={
															currentPage ===
															totalPages
														}
														className="border rounded-xl px-5 py-2 hover:bg-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
													>
														Next →
													</button>

												</div>
											</>
										)}

									</div>

								</div>

							</div>

						</div>

					</div>
				</div>

			</div>

			{/* Scheme Details Modal */}
			{selectedScheme && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

					<div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl border-4 border-emerald-200">

						{/* Modal Header */}
						<div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white flex items-start justify-between gap-4">

							<div>

								<h2 className="text-2xl font-bold">
									{selectedScheme.scheme_name}
								</h2>

								<p className="text-emerald-100 mt-1 text-sm">
									Government Agriculture Scheme
									Details
								</p>

							</div>

							<button
								onClick={() =>
									setSelectedScheme(null)
								}
								className="text-white text-2xl leading-none font-bold px-2"
								aria-label="Close details modal"
							>
								×
							</button>

						</div>

						{/* Modal Content */}
						<div className="p-6 space-y-5">

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

								<div className="rounded-xl bg-emerald-50 p-4 border">

									<p className="text-sm text-emerald-700">
										Category
									</p>

									<p className="font-semibold mt-1">
										{getCategoryLabel(
											selectedScheme.category
										)}
									</p>

								</div>

								<div className="rounded-xl bg-blue-50 p-4 border">

									<p className="text-sm text-blue-700">
										Government
									</p>

									<p className="font-semibold mt-1">
										{
											selectedScheme.government
										}
									</p>

								</div>

								<div className="rounded-xl bg-yellow-50 p-4 border">

									<p className="text-sm text-yellow-700">
										Department
									</p>

									<p className="font-semibold mt-1">
										{
											selectedScheme.department
										}
									</p>

								</div>

								<div className="rounded-xl bg-gray-50 p-4 border">

									<p className="text-sm text-gray-700">
										Status
									</p>

									<p className="font-semibold mt-1">
										{selectedScheme.status}
									</p>

								</div>

							</div>

							<div className="space-y-4 text-gray-700">

								<p>
									<strong>
										Description:
									</strong>{" "}
									{
										selectedScheme.description
									}
								</p>

								<p>
									<strong>
										Beneficiary:
									</strong>{" "}
									{
										selectedScheme.beneficiary
									}
								</p>

								<p>
									<strong>
										Eligibility:
									</strong>{" "}
									{
										selectedScheme.eligibility
									}
								</p>

								<p>
									<strong>
										Benefits:
									</strong>{" "}
									{
										selectedScheme.benefits
									}
								</p>

								<p>
									<strong>
										Required Documents:
									</strong>{" "}
									{
										selectedScheme.required_documents
									}
								</p>

								<p>
									<strong>
										Application Mode:
									</strong>{" "}
									{
										selectedScheme.application_mode
									}
								</p>

							</div>

							{selectedScheme.official_link && (
								<div className="pt-2">

									<button
										onClick={() =>
											handleOpenWebsite(
												selectedScheme.official_link
											)
										}
										className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-semibold"
									>
										Official Website
									</button>

								</div>
							)}

						</div>
					</div>
				</div>
			)}

		</div>
	);
};

export default Schemes;