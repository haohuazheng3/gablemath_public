// Static per-state facts that change at most yearly (the monthly EIA prices live in
// src/data/eia-residential-rates.json and are refreshed by scripts/refreshers/eia-rates.ts).
// Generated from research/electricity.verified.json (regional_data) plus two primary sources fetched
// 2026-10-23; every value traces to:
//  - kwh / bill: EIA-861M sales_revenue.xlsx, 2025 average residential use and bill per customer per month.
//  - cents2025: EIA Electric Power Annual 2025, Table 2.10 (final, released 2026-10-21).
//  - gas: EIA residential natural gas price, 2025 annual $/Mcf ÷ 10.36 therms per Mcf (2024 where 2025 is
//    withheld — gasYear says which), released 2026-09-30.
//  - propane / oil: EIA Heating Oil & Propane Update, residential, week of 2026-10-19, excluding taxes
//    (null = state not surveyed).
//  - seer2: DOE efficiency region for central air conditioners, 10 CFR 430.32(c)(6).
//  - gasoline: EIA Gasoline and Diesel Fuel Update, regular, week of 2026-10-19, incl. taxes — the state
//    series where EIA publishes one, otherwise the PADD region named in gasolineArea.
//  - hdd / cdd: NOAA Climate Prediction Center population-weighted state degree-day normals (base 65°F)
//    by month Jan–Dec, from the monthly summaries (normal = month total − departure from normal).

export interface StateInfo {
  code: string;
  name: string;
  slug: string;
  /** Average residential use, kWh per month (2025). */
  kwh: number;
  /** Average residential bill, USD per month (2025). */
  bill: number;
  /** 2025 annual average residential price, cents/kWh. */
  cents2025: number;
  /** Residential natural gas, USD per therm. */
  gas: number;
  gasYear: 2024 | 2025;
  /** Residential propane, USD per gallon. */
  propane: number | null;
  /** Residential No. 2 heating oil, USD per gallon. */
  oil: number | null;
  seer2: "north" | "southeast" | "southwest";
  /** Regular gasoline, USD per gallon. */
  gasoline: number;
  gasolineArea: string;
  /** Normal heating degree days, Jan–Dec. */
  hdd: number[];
  /** Normal cooling degree days, Jan–Dec. */
  cdd: number[];
}

export const STATE_INFO: StateInfo[] = [
  { code: "AL", name: "Alabama", slug: "alabama", kwh: 1152, bill: 185.42, cents2025: 16.09, gas: 1.695, gasYear: 2025, propane: 3.573, oil: null, seer2: "southeast", gasoline: 3.784, gasolineArea: "Gulf Coast (PADD 3)", hdd: [680, 503, 346, 151, 40, 2, 0, 0, 15, 153, 358, 591], cdd: [12, 6, 27, 46, 178, 344, 455, 429, 268, 80, 14, 6] },
  { code: "AK", name: "Alaska", slug: "alaska", kwh: 564, bill: 147.14, cents2025: 26.11, gas: 1.251, gasYear: 2025, propane: null, oil: null, seer2: "north", gasoline: 5.007, gasolineArea: "West Coast less California", hdd: [1644, 1398, 1307, 922, 591, 328, 229, 299, 538, 999, 1364, 1573], cdd: [0, 0, 0, 0, 0, 3, 8, 2, 0, 0, 0, 0] },
  { code: "AZ", name: "Arizona", slug: "arizona", kwh: 1030, bill: 157.77, cents2025: 15.26, gas: 1.793, gasYear: 2025, propane: null, oil: null, seer2: "southwest", gasoline: 5.007, gasolineArea: "West Coast less California", hdd: [492, 349, 275, 137, 40, 4, 0, 0, 7, 76, 290, 490], cdd: [3, 12, 37, 110, 274, 513, 660, 613, 435, 179, 24, 1] },
  { code: "AR", name: "Arkansas", slug: "arkansas", kwh: 1074, bill: 137.89, cents2025: 12.87, gas: 1.858, gasYear: 2025, propane: 2.596, oil: null, seer2: "southeast", gasoline: 3.784, gasolineArea: "Gulf Coast (PADD 3)", hdd: [836, 608, 432, 182, 49, 4, 0, 2, 26, 173, 455, 739], cdd: [1, 2, 17, 34, 152, 338, 478, 440, 238, 57, 4, 1] },
  { code: "CA", name: "California", slug: "california", kwh: 480, bill: 156.27, cents2025: 31.35, gas: 2.125, gasYear: 2025, propane: null, oil: null, seer2: "southwest", gasoline: 6.031, gasolineArea: "California", hdd: [484, 373, 358, 249, 146, 51, 10, 9, 31, 119, 321, 483], cdd: [3, 2, 7, 22, 58, 131, 228, 233, 159, 54, 7, 1] },
  { code: "CO", name: "Colorado", slug: "colorado", kwh: 678, bill: 107.41, cents2025: 15.69, gas: 1.078, gasYear: 2025, propane: 2.362, oil: null, seer2: "north", gasoline: 4.274, gasolineArea: "Colorado", hdd: [1239, 1005, 910, 665, 399, 145, 33, 59, 243, 573, 937, 1200], cdd: [0, 0, 0, 0, 4, 56, 114, 81, 18, 0, 0, 0] },
  { code: "CT", name: "Connecticut", slug: "connecticut", kwh: 705, bill: 207.16, cents2025: 29.31, gas: 1.625, gasYear: 2024, propane: 4.226, oil: 6.154, seer2: "north", gasoline: 4.249, gasolineArea: "New England (PADD 1A)", hdd: [1177, 997, 846, 522, 232, 42, 4, 14, 115, 421, 681, 1018], cdd: [0, 0, 0, 0, 18, 94, 226, 185, 42, 2, 0, 0] },
  { code: "DE", name: "Delaware", slug: "delaware", kwh: 932, bill: 159.58, cents2025: 17.15, gas: 1.542, gasYear: 2025, propane: 3.755, oil: 6.431, seer2: "southeast", gasoline: 4.312, gasolineArea: "Central Atlantic (PADD 1B)", hdd: [996, 836, 670, 371, 127, 10, 0, 1, 42, 285, 552, 850], cdd: [0, 0, 0, 2, 57, 205, 351, 299, 124, 19, 0, 0] },
  { code: "DC", name: "District of Columbia", slug: "district-of-columbia", kwh: 639, bill: 140.18, cents2025: 21.92, gas: 1.61, gasYear: 2025, propane: null, oil: null, seer2: "southeast", gasoline: 4.312, gasolineArea: "Central Atlantic (PADD 1B)", hdd: [917, 742, 563, 272, 73, 5, 0, 7, 19, 205, 477, 775], cdd: [0, 0, 4, 21, 107, 304, 456, 407, 200, 28, 4, 0] },
  { code: "FL", name: "Florida", slug: "florida", kwh: 1099, bill: 167.54, cents2025: 15.21, gas: 2.459, gasYear: 2025, propane: 4.928, oil: null, seer2: "southeast", gasoline: 3.981, gasolineArea: "Florida", hdd: [213, 154, 78, 18, 1, 0, 0, 0, 0, 10, 60, 160], cdd: [97, 90, 141, 197, 352, 461, 522, 521, 458, 309, 171, 102] },
  { code: "GA", name: "Georgia", slug: "georgia", kwh: 1091, bill: 160.67, cents2025: 14.74, gas: 1.971, gasYear: 2025, propane: 3.212, oil: null, seer2: "southeast", gasoline: 3.86, gasolineArea: "Lower Atlantic (PADD 1C)", hdd: [680, 511, 358, 159, 46, 4, 0, 0, 15, 154, 358, 598], cdd: [10, 5, 22, 37, 159, 320, 432, 396, 237, 65, 13, 5] },
  { code: "HI", name: "Hawaii", slug: "hawaii", kwh: 511, bill: 207.33, cents2025: 40.4, gas: 5.056, gasYear: 2025, propane: null, oil: null, seer2: "southeast", gasoline: 5.007, gasolineArea: "West Coast less California", hdd: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], cdd: [236, 215, 273, 300, 357, 411, 462, 489, 466, 445, 360, 287] },
  { code: "ID", name: "Idaho", slug: "idaho", kwh: 933, bill: 110.29, cents2025: 11.83, gas: 0.742, gasYear: 2025, propane: 2.586, oil: null, seer2: "north", gasoline: 4.468, gasolineArea: "Rocky Mountain (PADD 4)", hdd: [1212, 941, 800, 553, 335, 144, 39, 50, 223, 532, 891, 1188], cdd: [0, 0, 0, 1, 14, 69, 175, 155, 41, 1, 0, 0] },
  { code: "IL", name: "Illinois", slug: "illinois", kwh: 722, bill: 127.67, cents2025: 17.67, gas: 1.086, gasYear: 2025, propane: 1.943, oil: null, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1325, 1045, 830, 474, 215, 38, 5, 21, 99, 395, 753, 1154], cdd: [0, 0, 1, 3, 70, 183, 286, 237, 82, 13, 0, 0] },
  { code: "IN", name: "Indiana", slug: "indiana", kwh: 957, bill: 155.34, cents2025: 15.96, gas: 1.109, gasYear: 2025, propane: 2.559, oil: 6.053, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1227, 982, 771, 435, 195, 31, 5, 18, 96, 376, 692, 1066], cdd: [0, 0, 2, 4, 75, 189, 285, 233, 92, 14, 0, 0] },
  { code: "IA", name: "Iowa", slug: "iowa", kwh: 857, bill: 117.56, cents2025: 13.62, gas: 1.024, gasYear: 2025, propane: 1.704, oil: 5.817, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1461, 1143, 900, 498, 217, 40, 11, 29, 131, 445, 876, 1308], cdd: [0, 0, 1, 4, 68, 182, 281, 223, 69, 10, 0, 0] },
  { code: "KS", name: "Kansas", slug: "kansas", kwh: 880, bill: 128.16, cents2025: 14.44, gas: 1.43, gasYear: 2025, propane: 2.074, oil: null, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1125, 851, 641, 330, 124, 17, 2, 8, 66, 276, 665, 1014], cdd: [0, 1, 7, 14, 98, 283, 441, 392, 175, 29, 1, 0] },
  { code: "KY", name: "Kentucky", slug: "kentucky", kwh: 1131, bill: 149.78, cents2025: 13.13, gas: 1.374, gasYear: 2025, propane: 2.844, oil: 5.89, seer2: "southeast", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1003, 784, 596, 311, 129, 13, 1, 4, 56, 287, 563, 869], cdd: [1, 0, 8, 11, 94, 230, 350, 305, 147, 26, 1, 1] },
  { code: "LA", name: "Louisiana", slug: "louisiana", kwh: 1228, bill: 154.29, cents2025: 12.52, gas: 1.679, gasYear: 2025, propane: null, oil: null, seer2: "southeast", gasoline: 3.784, gasolineArea: "Gulf Coast (PADD 3)", hdd: [489, 337, 202, 60, 4, 0, 0, 0, 2, 63, 218, 409], cdd: [27, 20, 56, 108, 285, 445, 529, 518, 374, 152, 45, 16] },
  { code: "ME", name: "Maine", slug: "maine", kwh: 532, bill: 147.7, cents2025: 27.69, gas: 1.829, gasYear: 2024, propane: 3.709, oil: 6.026, seer2: "north", gasoline: 4.249, gasolineArea: "New England (PADD 1A)", hdd: [1456, 1234, 1071, 706, 386, 125, 35, 58, 242, 579, 860, 1260], cdd: [0, 0, 0, 0, 2, 27, 107, 84, 8, 0, 0, 0] },
  { code: "MD", name: "Maryland", slug: "maryland", kwh: 948, bill: 184.75, cents2025: 19.53, gas: 1.558, gasYear: 2024, propane: 3.799, oil: 6.371, seer2: "southeast", gasoline: 4.312, gasolineArea: "Central Atlantic (PADD 1B)", hdd: [1019, 840, 669, 364, 131, 12, 1, 2, 50, 303, 579, 879], cdd: [0, 0, 0, 3, 61, 199, 340, 287, 118, 16, 0, 0] },
  { code: "MA", name: "Massachusetts", slug: "massachusetts", kwh: 600, bill: 182.98, cents2025: 30.41, gas: 2.419, gasYear: 2025, propane: 3.659, oil: 6.115, seer2: "north", gasoline: 4.202, gasolineArea: "Massachusetts", hdd: [1209, 1031, 891, 573, 276, 62, 7, 19, 141, 450, 703, 1045], cdd: [0, 0, 0, 0, 9, 72, 190, 151, 29, 1, 0, 0] },
  { code: "MI", name: "Michigan", slug: "michigan", kwh: 634, bill: 126.87, cents2025: 20.03, gas: 1.054, gasYear: 2025, propane: 2.434, oil: 5.808, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1325, 1125, 951, 582, 279, 67, 14, 36, 148, 470, 794, 1158], cdd: [0, 0, 0, 1, 41, 114, 203, 162, 42, 5, 0, 0] },
  { code: "MN", name: "Minnesota", slug: "minnesota", kwh: 742, bill: 117.46, cents2025: 15.83, gas: 1.06, gasYear: 2025, propane: 2.014, oil: 5.916, seer2: "north", gasoline: 4.18, gasolineArea: "Minnesota", hdd: [1720, 1352, 1121, 649, 303, 92, 32, 58, 235, 587, 1062, 1545], cdd: [0, 0, 0, 2, 38, 103, 182, 132, 24, 2, 0, 0] },
  { code: "MS", name: "Mississippi", slug: "mississippi", kwh: 1183, bill: 166.02, cents2025: 14.03, gas: 1.607, gasYear: 2025, propane: 3.137, oil: null, seer2: "southeast", gasoline: 3.784, gasolineArea: "Gulf Coast (PADD 3)", hdd: [641, 461, 306, 119, 22, 1, 0, 0, 9, 126, 323, 555], cdd: [12, 9, 35, 63, 209, 385, 488, 462, 299, 94, 16, 7] },
  { code: "MO", name: "Missouri", slug: "missouri", kwh: 1063, bill: 143.31, cents2025: 13.3, gas: 1.442, gasYear: 2025, propane: 2.181, oil: null, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1148, 875, 661, 333, 135, 18, 2, 10, 73, 302, 647, 1014], cdd: [0, 0, 6, 12, 95, 247, 387, 335, 142, 25, 1, 0] },
  { code: "MT", name: "Montana", slug: "montana", kwh: 853, bill: 110.68, cents2025: 12.99, gas: 0.868, gasYear: 2025, propane: 2.168, oil: null, seer2: "north", gasoline: 4.468, gasolineArea: "Rocky Mountain (PADD 4)", hdd: [1381, 1095, 973, 683, 430, 207, 89, 101, 333, 653, 1041, 1324], cdd: [0, 0, 0, 0, 5, 38, 99, 87, 19, 0, 0, 0] },
  { code: "NE", name: "Nebraska", slug: "nebraska", kwh: 970, bill: 119.76, cents2025: 12.05, gas: 1.1, gasYear: 2025, propane: 1.783, oil: 5.63, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1325, 1032, 827, 459, 205, 39, 11, 21, 122, 412, 851, 1220], cdd: [0, 0, 2, 5, 71, 214, 335, 275, 96, 10, 0, 0] },
  { code: "NV", name: "Nevada", slug: "nevada", kwh: 870, bill: 114.41, cents2025: 13.26, gas: 1.268, gasYear: 2025, propane: null, oil: null, seer2: "southwest", gasoline: 5.007, gasolineArea: "West Coast less California", hdd: [764, 554, 459, 287, 134, 37, 5, 9, 54, 221, 518, 761], cdd: [1, 4, 15, 55, 163, 346, 518, 469, 263, 82, 5, 0] },
  { code: "NH", name: "New Hampshire", slug: "new-hampshire", kwh: 639, bill: 156.96, cents2025: 24.53, gas: 1.796, gasYear: 2025, propane: 3.843, oil: 6.033, seer2: "north", gasoline: 4.249, gasolineArea: "New England (PADD 1A)", hdd: [1405, 1186, 1018, 653, 320, 85, 18, 49, 221, 565, 842, 1226], cdd: [0, 0, 0, 0, 8, 48, 136, 101, 11, 0, 0, 0] },
  { code: "NJ", name: "New Jersey", slug: "new-jersey", kwh: 664, bill: 150.28, cents2025: 22.48, gas: 1.372, gasYear: 2025, propane: 4.075, oil: 6.382, seer2: "north", gasoline: 4.312, gasolineArea: "Central Atlantic (PADD 1B)", hdd: [1091, 920, 763, 450, 183, 24, 1, 5, 77, 366, 622, 942], cdd: [0, 0, 0, 0, 33, 141, 282, 229, 73, 8, 0, 0] },
  { code: "NM", name: "New Mexico", slug: "new-mexico", kwh: 654, bill: 98.58, cents2025: 14.85, gas: 0.949, gasYear: 2025, propane: null, oil: null, seer2: "southwest", gasoline: 3.784, gasolineArea: "Gulf Coast (PADD 3)", hdd: [940, 712, 600, 380, 165, 32, 5, 11, 77, 323, 666, 925], cdd: [0, 0, 0, 8, 56, 200, 290, 236, 94, 9, 0, 0] },
  { code: "NY", name: "New York", slug: "new-york", kwh: 586, bill: 154.64, cents2025: 26.39, gas: 1.697, gasYear: 2025, propane: 3.727, oil: 6.417, seer2: "north", gasoline: 4.313, gasolineArea: "New York", hdd: [1188, 1017, 867, 528, 233, 45, 8, 18, 113, 405, 678, 1016], cdd: [0, 0, 0, 0, 24, 107, 233, 195, 56, 6, 0, 0] },
  { code: "NC", name: "North Carolina", slug: "north-carolina", kwh: 1043, bill: 146.26, cents2025: 14.0, gas: 1.585, gasYear: 2024, propane: 3.612, oil: 5.828, seer2: "southeast", gasoline: 3.86, gasolineArea: "Lower Atlantic (PADD 1C)", hdd: [785, 619, 462, 212, 70, 8, 0, 1, 27, 215, 433, 693], cdd: [3, 1, 10, 16, 111, 271, 396, 348, 185, 40, 4, 2] },
  { code: "ND", name: "North Dakota", slug: "north-dakota", kwh: 1073, bill: 126.8, cents2025: 11.82, gas: 0.917, gasYear: 2025, propane: 1.651, oil: null, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1795, 1410, 1196, 702, 339, 127, 50, 72, 289, 663, 1175, 1630], cdd: [0, 0, 0, 2, 29, 93, 165, 139, 24, 0, 0, 0] },
  { code: "OH", name: "Ohio", slug: "ohio", kwh: 883, bill: 149.8, cents2025: 16.9, gas: 1.337, gasYear: 2025, propane: 2.647, oil: 6.031, seer2: "north", gasoline: 4.049, gasolineArea: "Ohio", hdd: [1199, 989, 800, 470, 218, 40, 6, 18, 106, 396, 693, 1037], cdd: [0, 0, 1, 2, 57, 149, 245, 200, 74, 10, 0, 0] },
  { code: "OK", name: "Oklahoma", slug: "oklahoma", kwh: 1071, bill: 140.46, cents2025: 13.21, gas: 1.388, gasYear: 2025, propane: 2.352, oil: null, seer2: "southeast", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [896, 652, 463, 200, 50, 3, 0, 2, 29, 165, 491, 799], cdd: [0, 3, 14, 35, 148, 351, 518, 487, 256, 60, 3, 0] },
  { code: "OR", name: "Oregon", slug: "oregon", kwh: 873, bill: 134.21, cents2025: 15.46, gas: 1.613, gasYear: 2025, propane: null, oil: null, seer2: "north", gasoline: 5.007, gasolineArea: "West Coast less California", hdd: [816, 647, 605, 471, 319, 162, 63, 61, 155, 395, 637, 819], cdd: [0, 0, 0, 0, 5, 24, 87, 87, 33, 1, 0, 0] },
  { code: "PA", name: "Pennsylvania", slug: "pennsylvania", kwh: 842, bill: 162.55, cents2025: 19.29, gas: 1.452, gasYear: 2025, propane: 3.163, oil: 6.066, seer2: "north", gasoline: 4.312, gasolineArea: "Central Atlantic (PADD 1B)", hdd: [1159, 974, 809, 478, 214, 41, 8, 18, 110, 411, 681, 1006], cdd: [0, 0, 0, 1, 38, 125, 236, 194, 60, 7, 0, 0] },
  { code: "RI", name: "Rhode Island", slug: "rhode-island", kwh: 562, bill: 165.51, cents2025: 29.48, gas: 2.091, gasYear: 2024, propane: 4.167, oil: 6.38, seer2: "north", gasoline: 4.249, gasolineArea: "New England (PADD 1A)", hdd: [1113, 958, 840, 549, 270, 58, 5, 13, 105, 388, 635, 955], cdd: [0, 0, 0, 0, 7, 66, 194, 169, 39, 2, 0, 0] },
  { code: "SC", name: "South Carolina", slug: "south-carolina", kwh: 1075, bill: 160.9, cents2025: 15.12, gas: 1.632, gasYear: 2024, propane: null, oil: null, seer2: "southeast", gasoline: 3.86, gasolineArea: "Lower Atlantic (PADD 1C)", hdd: [666, 506, 354, 139, 34, 2, 0, 0, 10, 148, 346, 590], cdd: [9, 4, 21, 37, 171, 342, 463, 417, 250, 69, 12, 5] },
  { code: "SD", name: "South Dakota", slug: "south-dakota", kwh: 1005, bill: 134.45, cents2025: 13.32, gas: 0.952, gasYear: 2025, propane: 1.87, oil: null, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1503, 1181, 992, 594, 291, 94, 36, 41, 197, 533, 1000, 1386], cdd: [0, 0, 0, 3, 45, 146, 264, 210, 60, 3, 0, 0] },
  { code: "TN", name: "Tennessee", slug: "tennessee", kwh: 1217, bill: 160.35, cents2025: 13.22, gas: 1.143, gasYear: 2025, propane: 3.219, oil: null, seer2: "southeast", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [889, 683, 505, 248, 92, 8, 0, 1, 40, 250, 502, 782], cdd: [2, 1, 11, 17, 111, 264, 384, 342, 176, 38, 2, 1] },
  { code: "TX", name: "Texas", slug: "texas", kwh: 1118, bill: 172.99, cents2025: 15.4, gas: 1.875, gasYear: 2025, propane: 3.137, oil: null, seer2: "southeast", gasoline: 3.704, gasolineArea: "Texas", hdd: [534, 367, 221, 73, 10, 0, 0, 0, 5, 62, 255, 470], cdd: [15, 18, 61, 117, 283, 454, 564, 549, 372, 160, 43, 11] },
  { code: "UT", name: "Utah", slug: "utah", kwh: 777, bill: 101.53, cents2025: 13.02, gas: 0.984, gasYear: 2025, propane: 2.329, oil: null, seer2: "north", gasoline: 4.468, gasolineArea: "Rocky Mountain (PADD 4)", hdd: [1207, 951, 794, 551, 312, 106, 13, 22, 164, 478, 853, 1162], cdd: [0, 0, 0, 4, 25, 115, 250, 210, 61, 6, 0, 0] },
  { code: "VT", name: "Vermont", slug: "vermont", kwh: 594, bill: 136.14, cents2025: 22.79, gas: 1.737, gasYear: 2025, propane: 3.881, oil: 6.097, seer2: "north", gasoline: 4.249, gasolineArea: "New England (PADD 1A)", hdd: [1487, 1277, 1097, 693, 337, 97, 31, 68, 250, 596, 886, 1291], cdd: [0, 0, 0, 0, 12, 42, 122, 88, 12, 0, 0, 0] },
  { code: "VA", name: "Virginia", slug: "virginia", kwh: 1067, bill: 163.08, cents2025: 15.28, gas: 1.621, gasYear: 2025, propane: 3.76, oil: 6.003, seer2: "southeast", gasoline: 3.86, gasolineArea: "Lower Atlantic (PADD 1C)", hdd: [942, 767, 608, 319, 123, 14, 1, 2, 51, 291, 538, 823], cdd: [0, 0, 2, 6, 67, 205, 334, 284, 129, 21, 1, 0] },
  { code: "WA", name: "Washington", slug: "washington", kwh: 954, bill: 125.12, cents2025: 13.17, gas: 1.701, gasYear: 2025, propane: null, oil: null, seer2: "north", gasoline: 5.332, gasolineArea: "Washington", hdd: [877, 696, 640, 476, 311, 166, 77, 73, 187, 450, 687, 873], cdd: [0, 0, 0, 0, 5, 23, 73, 76, 21, 0, 0, 0] },
  { code: "WV", name: "West Virginia", slug: "west-virginia", kwh: 1073, bill: 165.37, cents2025: 15.39, gas: 1.332, gasYear: 2025, propane: null, oil: null, seer2: "north", gasoline: 3.86, gasolineArea: "Lower Atlantic (PADD 1C)", hdd: [1061, 868, 698, 402, 188, 36, 5, 12, 90, 370, 635, 931], cdd: [0, 0, 2, 3, 54, 149, 251, 214, 85, 13, 0, 0] },
  { code: "WI", name: "Wisconsin", slug: "wisconsin", kwh: 666, bill: 120.9, cents2025: 18.08, gas: 1.037, gasYear: 2025, propane: 1.94, oil: 5.786, seer2: "north", gasoline: 4.145, gasolineArea: "Midwest (PADD 2)", hdd: [1513, 1217, 1020, 625, 310, 89, 23, 49, 184, 520, 907, 1334], cdd: [0, 0, 0, 1, 31, 101, 186, 148, 31, 4, 0, 0] },
  { code: "WY", name: "Wyoming", slug: "wyoming", kwh: 850, bill: 113.71, cents2025: 13.37, gas: 1.133, gasYear: 2025, propane: null, oil: null, seer2: "north", gasoline: 4.468, gasolineArea: "Rocky Mountain (PADD 4)", hdd: [1376, 1120, 994, 717, 448, 190, 59, 78, 304, 644, 1043, 1331], cdd: [0, 0, 0, 0, 6, 54, 123, 94, 19, 0, 0, 0] },
];

/** U.S. row: EIA-861M 2025 usage/bill, EPA 2025 price, U.S. gas $15.34/Mcf ÷ 10.36, weekly fuel and gasoline averages. */
export const US_INFO: StateInfo = {
  code: "US", name: "United States", slug: "united-states", kwh: 878, bill: 151.88, cents2025: 17.23, gas: 1.481, gasYear: 2025, propane: 2.689, oil: 6.19, seer2: "north", gasoline: 4.284, gasolineArea: "U.S. average", hdd: [917, 732, 593, 345, 159, 39, 9, 15, 77, 282, 539, 817], cdd: [9, 8, 18, 30, 97, 213, 321, 290, 155, 53, 15, 7],
};
