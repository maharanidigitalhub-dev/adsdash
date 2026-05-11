import { useState, useMemo } from "react";
import type { CSSProperties } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface DataRow {
  date: string;
  brand: string;
  platform: string;
  campaign: string;
  objective: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  revenue: number;
  month: string;
}

interface Totals {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

interface SliceItem {
  value: number;
  color: string;
}

interface PlatformSpend {
  label: string;
  color: string;
  value: number;
}

interface PlatformBreakdown {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
}

interface CampaignRow {
  brand: string;
  platform: string;
  campaign: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc?: number;
  revenue: number;
  roas: number;
}

interface ObjectiveRow {
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpm?: number;
}

interface DailyData {
  dates: string[];
  total: number[];
  meta: number[];
  google: number[];
}

// ─── RAW DATA ────────────────────────────────────────────────────────────────
const RAW_DATA: DataRow[] = [
  // META · KADO BAJO · FEB 2026
  { date:"2026-02-28", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:137250, impressions:3499904, reach:2431180, clicks:22312, conversions:0, ctr:0.64, cpc:6, cpm:39, revenue:0, month:"Feb 2026" },
  // META · KADO BAJO · MAR 2026
  { date:"2026-03-01", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:142297, impressions:5483271, reach:3659467, clicks:51876, conversions:0, ctr:0.95, cpc:3, cpm:26, revenue:0, month:"Mar 2026" },
  { date:"2026-03-01", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:73639, impressions:2276136, reach:1469427, clicks:18939, conversions:0, ctr:0.83, cpc:4, cpm:32, revenue:0, month:"Mar 2026" },
  { date:"2026-03-02", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:125940, impressions:3223553, reach:2421117, clicks:19641, conversions:0, ctr:0.61, cpc:6, cpm:39, revenue:0, month:"Mar 2026" },
  { date:"2026-03-02", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:65411, impressions:1554757, reach:964260, clicks:14971, conversions:0, ctr:0.96, cpc:4, cpm:42, revenue:0, month:"Mar 2026" },
  { date:"2026-03-03", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:105380, impressions:3053570, reach:2317623, clicks:25190, conversions:0, ctr:0.82, cpc:4, cpm:35, revenue:0, month:"Mar 2026" },
  { date:"2026-03-04", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:115463, impressions:4247342, reach:2766292, clicks:38426, conversions:0, ctr:0.90, cpc:3, cpm:27, revenue:0, month:"Mar 2026" },
  { date:"2026-03-05", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:145903, impressions:5684787, reach:3871885, clicks:38095, conversions:0, ctr:0.67, cpc:4, cpm:26, revenue:0, month:"Mar 2026" },
  { date:"2026-03-06", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:153775, impressions:4879571, reach:3266108, clicks:26660, conversions:0, ctr:0.55, cpc:6, cpm:32, revenue:0, month:"Mar 2026" },
  { date:"2026-03-07", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:148070, impressions:5489624, reach:4369446, clicks:49602, conversions:0, ctr:0.90, cpc:3, cpm:27, revenue:0, month:"Mar 2026" },
  { date:"2026-03-08", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:131884, impressions:5863867, reach:4458932, clicks:40417, conversions:0, ctr:0.69, cpc:3, cpm:22, revenue:0, month:"Mar 2026" },
  { date:"2026-03-09", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:94038, impressions:3910861, reach:3216062, clicks:31649, conversions:0, ctr:0.81, cpc:3, cpm:24, revenue:0, month:"Mar 2026" },
  { date:"2026-03-10", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:68447, impressions:2279909, reach:1488725, clicks:25562, conversions:0, ctr:1.12, cpc:3, cpm:30, revenue:0, month:"Mar 2026" },
  { date:"2026-03-11", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:64189, impressions:1878990, reach:1347080, clicks:18487, conversions:0, ctr:0.98, cpc:3, cpm:34, revenue:0, month:"Mar 2026" },
  { date:"2026-03-12", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:82795, impressions:2270381, reach:1815186, clicks:21648, conversions:0, ctr:0.95, cpc:4, cpm:36, revenue:0, month:"Mar 2026" },
  { date:"2026-03-13", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:71701, impressions:1713374, reach:1065598, clicks:14272, conversions:0, ctr:0.83, cpc:5, cpm:42, revenue:0, month:"Mar 2026" },
  { date:"2026-03-14", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Awareness", spend:84227, impressions:2529164, reach:1731040, clicks:34256, conversions:0, ctr:1.35, cpc:2, cpm:33, revenue:0, month:"Mar 2026" },
  { date:"2026-03-18", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Msg/WA/DM", spend:41506, impressions:629140, reach:344517, clicks:13474, conversions:2248, ctr:2.14, cpc:3, cpm:66, revenue:26976000, month:"Mar 2026" },
  { date:"2026-03-19", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Msg/WA/DM", spend:31632, impressions:341431, reach:209709, clicks:13216, conversions:1946, ctr:3.87, cpc:2, cpm:93, revenue:23352000, month:"Mar 2026" },
  { date:"2026-03-20", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Msg/WA/DM", spend:39780, impressions:590533, reach:306714, clicks:14059, conversions:2011, ctr:2.38, cpc:3, cpm:67, revenue:24132000, month:"Mar 2026" },
  { date:"2026-03-21", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Msg/WA/DM", spend:34623, impressions:443248, reach:281317, clicks:15328, conversions:3041, ctr:3.46, cpc:2, cpm:78, revenue:36492000, month:"Mar 2026" },
  { date:"2026-03-22", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Msg/WA/DM", spend:29977, impressions:372186, reach:250233, clicks:9969, conversions:1244, ctr:2.68, cpc:3, cpm:81, revenue:14928000, month:"Mar 2026" },
  { date:"2026-03-25", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Msg/WA/DM", spend:42847, impressions:643397, reach:440902, clicks:25336, conversions:4683, ctr:3.94, cpc:2, cpm:67, revenue:56196000, month:"Mar 2026" },
  { date:"2026-03-28", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Msg/WA/DM", spend:34614, impressions:544959, reach:333053, clicks:21748, conversions:3737, ctr:3.99, cpc:2, cpm:64, revenue:44844000, month:"Mar 2026" },
  { date:"2026-03-31", brand:"Kado Bajo", platform:"Meta", campaign:"Campaign Ramadhan", objective:"Msg/WA/DM", spend:36999, impressions:404939, reach:208957, clicks:15879, conversions:1882, ctr:3.92, cpc:2, cpm:91, revenue:22584000, month:"Mar 2026" },
  // TIKTOK · KADO BAJO · MAR 2026
  { date:"2026-03-07", brand:"Kado Bajo", platform:"TikTok", campaign:"Campaign Ramadhan", objective:"Awareness", spend:65443, impressions:2039595, reach:1337613, clicks:24419, conversions:1436, ctr:1.20, cpc:3, cpm:32, revenue:0, month:"Mar 2026" },
  { date:"2026-03-08", brand:"Kado Bajo", platform:"TikTok", campaign:"Campaign Ramadhan", objective:"Awareness", spend:90728, impressions:2347886, reach:1611452, clicks:23584, conversions:978, ctr:1.00, cpc:4, cpm:39, revenue:0, month:"Mar 2026" },
  { date:"2026-03-09", brand:"Kado Bajo", platform:"TikTok", campaign:"Campaign Ramadhan", objective:"Awareness", spend:71891, impressions:2506902, reach:1596778, clicks:14492, conversions:552, ctr:0.58, cpc:5, cpm:29, revenue:0, month:"Mar 2026" },
  { date:"2026-03-10", brand:"Kado Bajo", platform:"TikTok", campaign:"Campaign Ramadhan", objective:"Awareness", spend:93678, impressions:3580979, reach:2328056, clicks:24507, conversions:665, ctr:0.68, cpc:4, cpm:26, revenue:0, month:"Mar 2026" },
  { date:"2026-03-12", brand:"Kado Bajo", platform:"TikTok", campaign:"Campaign Ramadhan", objective:"Awareness", spend:68276, impressions:2499399, reach:1763889, clicks:21933, conversions:903, ctr:0.88, cpc:3, cpm:27, revenue:0, month:"Mar 2026" },
  { date:"2026-03-15", brand:"Kado Bajo", platform:"TikTok", campaign:"Campaign Ramadhan", objective:"Awareness", spend:66145, impressions:2160097, reach:1516648, clicks:11847, conversions:599, ctr:0.55, cpc:6, cpm:31, revenue:0, month:"Mar 2026" },
  { date:"2026-03-18", brand:"Kado Bajo", platform:"TikTok", campaign:"Campaign Ramadhan", objective:"Awareness", spend:73314, impressions:2927479, reach:1866619, clicks:27954, conversions:1137, ctr:0.95, cpc:3, cpm:25, revenue:0, month:"Mar 2026" },
  { date:"2026-03-20", brand:"Kado Bajo", platform:"TikTok", campaign:"Campaign Ramadhan", objective:"Awareness", spend:123288, impressions:3558122, reach:2406075, clicks:19558, conversions:570, ctr:0.55, cpc:6, cpm:35, revenue:0, month:"Mar 2026" },
  // META · KADO BAJO · APR 2026
  { date:"2026-04-11", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Msg/WA/DM", spend:67471, impressions:2597920, reach:1750939, clicks:16044, conversions:0, ctr:0.62, cpc:4, cpm:26, revenue:0, month:"Apr 2026" },
  { date:"2026-04-11", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:98695, impressions:2950151, reach:2093390, clicks:29816, conversions:0, ctr:1.01, cpc:3, cpm:33, revenue:0, month:"Apr 2026" },
  { date:"2026-04-12", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Msg/WA/DM", spend:75147, impressions:2248721, reach:1740231, clicks:17928, conversions:0, ctr:0.80, cpc:4, cpm:33, revenue:0, month:"Apr 2026" },
  { date:"2026-04-13", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:90260, impressions:2542740, reach:1634321, clicks:28212, conversions:0, ctr:1.11, cpc:3, cpm:35, revenue:0, month:"Apr 2026" },
  { date:"2026-04-15", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Msg/WA/DM", spend:69464, impressions:2153379, reach:1723506, clicks:14171, conversions:0, ctr:0.66, cpc:5, cpm:32, revenue:0, month:"Apr 2026" },
  { date:"2026-04-16", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:95826, impressions:3012920, reach:1943116, clicks:38292, conversions:0, ctr:1.27, cpc:3, cpm:32, revenue:0, month:"Apr 2026" },
  { date:"2026-04-18", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Msg/WA/DM", spend:74902, impressions:3189731, reach:2173959, clicks:21842, conversions:0, ctr:0.68, cpc:3, cpm:23, revenue:0, month:"Apr 2026" },
  { date:"2026-04-20", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:90306, impressions:2069859, reach:1560692, clicks:27439, conversions:0, ctr:1.33, cpc:3, cpm:44, revenue:0, month:"Apr 2026" },
  { date:"2026-04-22", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:85611, impressions:2005957, reach:1543919, clicks:19546, conversions:0, ctr:0.97, cpc:4, cpm:43, revenue:0, month:"Apr 2026" },
  { date:"2026-04-24", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:88245, impressions:2975157, reach:2149641, clicks:42366, conversions:0, ctr:1.42, cpc:2, cpm:30, revenue:0, month:"Apr 2026" },
  { date:"2026-04-26", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:98505, impressions:3088728, reach:2013351, clicks:34972, conversions:0, ctr:1.13, cpc:3, cpm:32, revenue:0, month:"Apr 2026" },
  { date:"2026-04-28", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:89309, impressions:2321623, reach:1525644, clicks:19832, conversions:0, ctr:0.85, cpc:5, cpm:38, revenue:0, month:"Apr 2026" },
  { date:"2026-04-30", brand:"Kado Bajo", platform:"Meta", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:92743, impressions:2364958, reach:1753105, clicks:30407, conversions:0, ctr:1.29, cpc:3, cpm:39, revenue:0, month:"Apr 2026" },
  // GOOGLE · KADO BAJO · APR 2026
  { date:"2026-04-11", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:70722, impressions:353476, reach:353476, clicks:15955, conversions:3906, ctr:4.51, cpc:4, cpm:200, revenue:46872000, month:"Apr 2026" },
  { date:"2026-04-13", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:93756, impressions:699271, reach:699271, clicks:62102, conversions:15508, ctr:8.88, cpc:2, cpm:134, revenue:186096000, month:"Apr 2026" },
  { date:"2026-04-15", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:93786, impressions:676097, reach:676097, clicks:56253, conversions:14047, ctr:8.32, cpc:2, cpm:139, revenue:168564000, month:"Apr 2026" },
  { date:"2026-04-17", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:91475, impressions:447288, reach:447288, clicks:36153, conversions:7000, ctr:8.08, cpc:3, cpm:205, revenue:84000000, month:"Apr 2026" },
  { date:"2026-04-19", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:70180, impressions:372869, reach:372869, clicks:31029, conversions:8523, ctr:8.32, cpc:2, cpm:188, revenue:102276000, month:"Apr 2026" },
  { date:"2026-04-21", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:81159, impressions:629546, reach:629546, clicks:28812, conversions:7930, ctr:4.58, cpc:3, cpm:129, revenue:95160000, month:"Apr 2026" },
  { date:"2026-04-23", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:77906, impressions:538656, reach:538656, clicks:29994, conversions:6508, ctr:5.57, cpc:3, cpm:145, revenue:78096000, month:"Apr 2026" },
  { date:"2026-04-25", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:86681, impressions:347310, reach:347310, clicks:29965, conversions:6177, ctr:8.63, cpc:3, cpm:250, revenue:74124000, month:"Apr 2026" },
  { date:"2026-04-27", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:66239, impressions:440949, reach:440949, clicks:24918, conversions:4241, ctr:5.65, cpc:3, cpm:150, revenue:50892000, month:"Apr 2026" },
  { date:"2026-04-29", brand:"Kado Bajo", platform:"Google", campaign:"2nd Floor Launch & CRM", objective:"Get Direction", spend:77069, impressions:432326, reach:432326, clicks:23684, conversions:3324, ctr:5.48, cpc:3, cpm:178, revenue:39888000, month:"Apr 2026" },
  // TIKTOK · KADO BAJO · APR 2026
  { date:"2026-04-11", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:28899, impressions:911391, reach:577051, clicks:8018, conversions:226, ctr:0.88, cpc:4, cpm:32, revenue:0, month:"Apr 2026" },
  { date:"2026-04-13", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:38718, impressions:1205999, reach:748143, clicks:6079, conversions:304, ctr:0.50, cpc:6, cpm:32, revenue:0, month:"Apr 2026" },
  { date:"2026-04-15", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:36446, impressions:1052007, reach:670304, clicks:6875, conversions:145, ctr:0.65, cpc:5, cpm:35, revenue:0, month:"Apr 2026" },
  { date:"2026-04-17", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:29787, impressions:1030739, reach:648132, clicks:5348, conversions:227, ctr:0.52, cpc:6, cpm:29, revenue:0, month:"Apr 2026" },
  { date:"2026-04-19", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:33307, impressions:957176, reach:672172, clicks:6975, conversions:245, ctr:0.73, cpc:5, cpm:35, revenue:0, month:"Apr 2026" },
  { date:"2026-04-21", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:35552, impressions:1422033, reach:967023, clicks:10593, conversions:542, ctr:0.74, cpc:3, cpm:25, revenue:0, month:"Apr 2026" },
  { date:"2026-04-23", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:30133, impressions:829183, reach:549577, clicks:8031, conversions:230, ctr:0.97, cpc:4, cpm:36, revenue:0, month:"Apr 2026" },
  { date:"2026-04-25", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:29603, impressions:1107702, reach:633184, clicks:13018, conversions:273, ctr:1.18, cpc:2, cpm:27, revenue:0, month:"Apr 2026" },
  { date:"2026-04-27", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:29064, impressions:1034103, reach:589831, clicks:9710, conversions:494, ctr:0.94, cpc:3, cpm:28, revenue:0, month:"Apr 2026" },
  { date:"2026-04-30", brand:"Kado Bajo", platform:"TikTok", campaign:"2nd Floor Launch & CRM", objective:"Awareness", spend:54998, impressions:2081733, reach:1188893, clicks:22391, conversions:1308, ctr:1.08, cpc:2, cpm:26, revenue:0, month:"Apr 2026" },
  // GOOGLE · ZODIAC BAJO · APR 2026
  { date:"2026-04-11", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:39534, impressions:289184, reach:289184, clicks:21794, conversions:4133, ctr:7.54, cpc:2, cpm:137, revenue:49596000, month:"Apr 2026" },
  { date:"2026-04-13", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:38073, impressions:225924, reach:225924, clicks:13957, conversions:3307, ctr:6.18, cpc:3, cpm:169, revenue:39684000, month:"Apr 2026" },
  { date:"2026-04-15", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:43224, impressions:215059, reach:215059, clicks:13599, conversions:2959, ctr:6.32, cpc:3, cpm:201, revenue:35508000, month:"Apr 2026" },
  { date:"2026-04-17", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:33182, impressions:238622, reach:238622, clicks:13605, conversions:3548, ctr:5.70, cpc:2, cpm:139, revenue:42576000, month:"Apr 2026" },
  { date:"2026-04-19", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:31284, impressions:215243, reach:215243, clicks:13867, conversions:3346, ctr:6.44, cpc:2, cpm:145, revenue:40152000, month:"Apr 2026" },
  { date:"2026-04-21", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:31396, impressions:153412, reach:153412, clicks:11442, conversions:1933, ctr:7.46, cpc:3, cpm:205, revenue:23196000, month:"Apr 2026" },
  { date:"2026-04-23", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:41189, impressions:219255, reach:219255, clicks:16475, conversions:2691, ctr:7.51, cpc:3, cpm:188, revenue:32292000, month:"Apr 2026" },
  { date:"2026-04-25", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:38038, impressions:268120, reach:268120, clicks:13206, conversions:2041, ctr:4.93, cpc:3, cpm:142, revenue:24492000, month:"Apr 2026" },
  { date:"2026-04-27", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:34245, impressions:150750, reach:150750, clicks:7493, conversions:1171, ctr:4.97, cpc:5, cpm:227, revenue:14052000, month:"Apr 2026" },
  { date:"2026-04-29", brand:"Zodiac Bajo", platform:"Google", campaign:"Regular Ads", objective:"Get Direction", spend:44614, impressions:277206, reach:277206, clicks:20754, conversions:2909, ctr:7.49, cpc:2, cpm:161, revenue:34908000, month:"Apr 2026" },
  // META · ZODIAC BAJO · APR 2026
  { date:"2026-04-11", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:82370, impressions:1055685, reach:566768, clicks:30413, conversions:3197, ctr:2.88, cpc:3, cpm:78, revenue:38364000, month:"Apr 2026" },
  { date:"2026-04-13", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:84142, impressions:868484, reach:532005, clicks:19961, conversions:2602, ctr:2.30, cpc:4, cpm:97, revenue:31224000, month:"Apr 2026" },
  { date:"2026-04-15", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:71222, impressions:935531, reach:550601, clicks:27140, conversions:5048, ctr:2.90, cpc:3, cpm:76, revenue:60576000, month:"Apr 2026" },
  { date:"2026-04-17", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:94323, impressions:1060825, reach:670532, clicks:25693, conversions:2972, ctr:2.42, cpc:4, cpm:89, revenue:35664000, month:"Apr 2026" },
  { date:"2026-04-19", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:73320, impressions:835031, reach:534918, clicks:28507, conversions:4145, ctr:3.41, cpc:3, cpm:88, revenue:49740000, month:"Apr 2026" },
  { date:"2026-04-21", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:93877, impressions:1178234, reach:741730, clicks:36397, conversions:6946, ctr:3.09, cpc:3, cpm:80, revenue:83352000, month:"Apr 2026" },
  { date:"2026-04-23", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:82215, impressions:964518, reach:615107, clicks:21689, conversions:3686, ctr:2.25, cpc:4, cpm:85, revenue:44232000, month:"Apr 2026" },
  { date:"2026-04-25", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:77825, impressions:928758, reach:481343, clicks:23225, conversions:4556, ctr:2.50, cpc:3, cpm:84, revenue:54672000, month:"Apr 2026" },
  { date:"2026-04-27", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:72624, impressions:743770, reach:441873, clicks:26125, conversions:4314, ctr:3.51, cpc:3, cpm:98, revenue:51768000, month:"Apr 2026" },
  { date:"2026-04-29", brand:"Zodiac Bajo", platform:"Meta", campaign:"Regular Ads", objective:"Msg/WA/DM", spend:58240, impressions:703991, reach:446349, clicks:18772, conversions:3487, ctr:2.67, cpc:3, cpm:83, revenue:41844000, month:"Apr 2026" },
];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALL_CLIENTS  = ["All Clients", "Kado Bajo", "Zodiac Bajo"] as const;
const ALL_PLATFORMS = ["All", "Meta", "Google", "TikTok"] as const;
const PERIOD_OPTIONS = ["Last 7 days", "Last 30 days", "All time"] as const;
const TAB_IDS    = ["overview", "campaign", "creative", "audience", "budget"] as const;
const TAB_LABELS = ["Overview", "Campaign", "Creative", "Audience", "Budget"] as const;

type ClientFilter   = typeof ALL_CLIENTS[number];
type PlatformFilter = typeof ALL_PLATFORMS[number];
type PeriodFilter   = typeof PERIOD_OPTIONS[number];
type TabId          = typeof TAB_IDS[number];

const PLATFORM_COLORS: Record<string, string> = { Meta:"#1877F2", Google:"#EA4335", TikTok:"#000000" };
const PLATFORM_BG:     Record<string, string> = { Meta:"#EBF3FE", Google:"#FEECEB", TikTok:"#F3F4F6" };
const BRAND_COLORS:    Record<string, string> = { "Kado Bajo":"#7C3AED", "Zodiac Bajo":"#0EA5E9" };
const OBJ_COLORS:      Record<string, string> = { "Awareness":"#7C3AED", "Msg/WA/DM":"#06B6D4", "Get Direction":"#10B981" };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt    = (n: number): string => n >= 1e9 ? (n/1e9).toFixed(1)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : (n||0).toFixed(0);
const fmtRp  = (n: number): string => "Rp " + fmt(n);
const fmtPct = (n: number): string => (n||0).toFixed(2) + "%";
const sum    = (arr: DataRow[], k: keyof DataRow): number => arr.reduce((a, b) => a + ((b[k] as number) || 0), 0);
const avg    = (arr: DataRow[], k: keyof DataRow): number => arr.length ? sum(arr, k) / arr.length : 0;

function exportCSV(data: DataRow[]): void {
  const hdr = "Date,Brand,Platform,Campaign,Objective,Spend,Impressions,Reach,Clicks,Conversions,CTR,CPC,CPM";
  const rows = data.map(r => [r.date,r.brand,r.platform,r.campaign,r.objective,r.spend,r.impressions,r.reach,r.clicks,r.conversions,r.ctr,r.cpc,r.cpm].join(","));
  const csv  = [hdr, ...rows].join("\n");
  const url  = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
  const a    = document.createElement("a");
  a.href = url; a.download = "adsdash_export.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
interface SparkProps { data: number[]; color?: string; h?: number; }
function Spark({ data, color = "#7C3AED", h = 28 }: SparkProps) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1;
  const W = 80;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${h - ((v - mn) / range) * h}`).join(" ");
  return (
    <svg width={W} height={h} style={{ display:"block", overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── DONUT ───────────────────────────────────────────────────────────────────
interface DonutProps { slices: SliceItem[]; size?: number; stroke?: number; }
function Donut({ slices, size = 100, stroke = 18 }: DonutProps) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} style={{ display:"block" }}>
      {slices.map((s, i) => {
        const pct  = s.value / total;
        const dash = pct * circ, gap = circ - dash;
        const offset = -circ * acc;
        acc += pct;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset}
            style={{ transform:`rotate(-90deg)`, transformOrigin:`${size/2}px ${size/2}px` }} />
        );
      })}
      <circle cx={size/2} cy={size/2} r={r - stroke/2 + 2} fill="white" />
    </svg>
  );
}

// ─── LINE CHART ──────────────────────────────────────────────────────────────
interface LineSeries { color: string; data: number[]; }
interface LineChartProps { series: LineSeries[]; width?: number; height?: number; }
function LineChart({ series, width = 320, height = 120 }: LineChartProps) {
  if (!series?.length || !series[0].data.length) return null;
  const allVals = series.flatMap(s => s.data);
  const mn = Math.min(...allVals), mx = Math.max(...allVals) || 1, range = mx - mn || 1;
  const len = series[0].data.length;
  const toPath = (data: number[]) =>
    data.map((v, i) => {
      const x = (i / (len - 1)) * width;
      const y = height - ((v - mn) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    }).join(" ");
  return (
    <svg width={width} height={height} style={{ display:"block", overflow:"visible" }}>
      {series.map((s, si) => (
        <path key={si} d={toPath(s.data)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
}

// ─── BAR CHART ───────────────────────────────────────────────────────────────
interface BarItem { label: string; color: string; value: number; }
interface BarChartProps { items: BarItem[]; height?: number; }
function BarChart({ items, height = 60 }: BarChartProps) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display:"flex", gap:6, alignItems:"flex-end", height }}>
      {items.map((item, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
          <div style={{ width:"100%", background:item.color, borderRadius:"3px 3px 0 0",
            height: Math.max(4, (item.value / max) * (height - 16)), transition:"height .3s" }} />
          <span style={{ fontSize:9, color:"#9CA3AF", textAlign:"center", lineHeight:1 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string; value: string; sub?: string; subColor?: string;
  spark?: number[]; sparkColor?: string; icon?: string;
}
function KpiCard({ label, value, sub, subColor = "#10B981", spark, sparkColor, icon }: KpiCardProps) {
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:"16px 18px",
      boxShadow:"0 1px 3px rgba(0,0,0,.08)", display:"flex", flexDirection:"column", gap:6, minWidth:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:500, lineHeight:1.4 }}>{label}</span>
        {icon && <span style={{ fontSize:16 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:20, fontWeight:800, color:"#111", letterSpacing:"-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:subColor, fontWeight:500 }}>{sub}</div>}
      {spark && <div style={{ marginTop:2 }}><Spark data={spark} color={sparkColor ?? "#7C3AED"} /></div>}
    </div>
  );
}

// ─── PLATFORM BADGE ──────────────────────────────────────────────────────────
function PlatformBadge({ p }: { p: string }) {
  return (
    <span style={{ padding:"2px 8px", borderRadius:20,
      background: PLATFORM_BG[p] ?? "#F3F4F6",
      color: PLATFORM_COLORS[p] ?? "#374151",
      fontWeight:700, fontSize:11 }}>
      {p}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [client,   setClient]   = useState<ClientFilter>("All Clients");
  const [platform, setPlatform] = useState<PlatformFilter>("All");
  const [period,   setPeriod]   = useState<PeriodFilter>("Last 30 days");
  const [tab,      setTab]      = useState<TabId>("overview");

  const user = { email:"maharanidigitalhub@gmail.com", role:"founder" };

  // ── Filter
  const filtered = useMemo<DataRow[]>(() => {
    return RAW_DATA.filter(r => {
      if (client !== "All Clients" && r.brand !== client) return false;
      if (platform !== "All" && r.platform !== platform) return false;
      if (period === "Last 7 days") return new Date(r.date) >= new Date("2026-04-24");
      if (period === "Last 30 days") return new Date(r.date) >= new Date("2026-04-01");
      return true;
    });
  }, [client, platform, period]);

  // ── Totals
  const totals = useMemo<Totals>(() => ({
    spend:       sum(filtered, "spend"),
    impressions: sum(filtered, "impressions"),
    reach:       sum(filtered, "reach"),
    clicks:      sum(filtered, "clicks"),
    conversions: sum(filtered, "conversions"),
    revenue:     sum(filtered, "revenue"),
    ctr:         avg(filtered, "ctr"),
    cpc:         avg(filtered, "cpc"),
    cpm:         avg(filtered, "cpm"),
  }), [filtered]);

  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const cpa  = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

  // ── Spend by platform
  const spendByPlatform = useMemo<PlatformSpend[]>(() =>
    ["Meta","Google","TikTok"].map(p => ({
      label: p, color: PLATFORM_COLORS[p],
      value: sum(filtered.filter(r => r.platform === p), "spend"),
    })).filter(x => x.value > 0),
  [filtered]);

  const totalSpend = spendByPlatform.reduce((a, s) => a + s.value, 0) || 1;

  // ── ROAS by platform
  const rOasByPlatform = useMemo<PlatformSpend[]>(() =>
    ["Meta","Google","TikTok"].map(p => {
      const rows = filtered.filter(r => r.platform === p);
      const sp = sum(rows,"spend"), rv = sum(rows,"revenue");
      return { label:p, color:PLATFORM_COLORS[p], value: sp > 0 ? rv / sp : 0 };
    }).filter(x => x.value > 0),
  [filtered]);

  // ── Daily time series
  const dailyData = useMemo<DailyData>(() => {
    const map:    Record<string,number> = {};
    const metaM:  Record<string,number> = {};
    const googleM:Record<string,number> = {};
    filtered.forEach(r => {
      map[r.date]    = (map[r.date]    || 0) + r.spend;
      if (r.platform === "Meta")   metaM[r.date]   = (metaM[r.date]   || 0) + r.spend;
      if (r.platform === "Google") googleM[r.date] = (googleM[r.date] || 0) + r.spend;
    });
    const dates = Object.keys(map).sort();
    return {
      dates,
      total:  dates.map(d => map[d]),
      meta:   dates.map(d => metaM[d]   || 0),
      google: dates.map(d => googleM[d] || 0),
    };
  }, [filtered]);

  // ── Platform breakdown table
  const platformBreakdown = useMemo<PlatformBreakdown[]>(() =>
    ["Meta","Google","TikTok"].map(p => {
      const rows = filtered.filter(r => r.platform === p);
      if (!rows.length) return null;
      const sp = sum(rows,"spend"), rv = sum(rows,"revenue");
      return {
        platform: p,
        spend: sp, impressions: sum(rows,"impressions"),
        clicks: sum(rows,"clicks"), conversions: sum(rows,"conversions"),
        ctr: avg(rows,"ctr"), cpc: avg(rows,"cpc"), cpm: avg(rows,"cpm"),
        roas: sp > 0 ? rv / sp : 0,
      };
    }).filter((x): x is PlatformBreakdown => x !== null),
  [filtered]);

  // ── Campaign breakdown
  const campaignBreakdown = useMemo<CampaignRow[]>(() => {
    const map: Record<string, CampaignRow & { ctrs: number[] }> = {};
    filtered.forEach(r => {
      const k = `${r.brand}|${r.platform}|${r.campaign}`;
      if (!map[k]) map[k] = { brand:r.brand, platform:r.platform, campaign:r.campaign,
        spend:0, impressions:0, clicks:0, conversions:0, ctr:0, revenue:0, roas:0, ctrs:[] };
      map[k].spend       += r.spend;
      map[k].impressions += r.impressions;
      map[k].clicks      += r.clicks;
      map[k].conversions += r.conversions;
      map[k].revenue     += r.revenue;
      map[k].ctrs.push(r.ctr);
    });
    return Object.values(map).map(m => ({
      ...m,
      ctr:  m.ctrs.reduce((a,b) => a+b, 0) / m.ctrs.length,
      roas: m.spend > 0 ? m.revenue / m.spend : 0,
    }));
  }, [filtered]);

  // ── Objective breakdown
  const objectiveBreakdown = useMemo<ObjectiveRow[]>(() => {
    const map: Record<string, ObjectiveRow & { cpms: number[] }> = {};
    filtered.forEach(r => {
      if (!map[r.objective]) map[r.objective] = { objective:r.objective, spend:0, clicks:0, conversions:0, impressions:0, cpms:[] };
      map[r.objective].spend       += r.spend;
      map[r.objective].clicks      += r.clicks;
      map[r.objective].conversions += r.conversions;
      map[r.objective].impressions += r.impressions;
      map[r.objective].cpms!.push(r.cpm);
    });
    return Object.values(map).map(m => ({
      ...m,
      cpm: m.cpms!.reduce((a,b) => a+b, 0) / (m.cpms!.length || 1),
    }));
  }, [filtered]);

  // ── pill button style helper
  const pill = (active: boolean): CSSProperties => ({
    padding:"4px 10px", borderRadius:20, border:"1px solid",
    fontSize:11, cursor:"pointer", fontWeight: active ? 700 : 400,
    borderColor: active ? "#111" : "#E5E7EB",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#374151",
  });

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#F7F8FA",
      minHeight:"100vh", maxWidth:480, margin:"0 auto", position:"relative" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"#fff", padding:"14px 16px 0", borderBottom:"1px solid #F0F0F4" }}>
        {/* Top row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, background:"linear-gradient(135deg,#7C3AED,#06B6D4)",
              borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📊</div>
            <span style={{ fontWeight:800, fontSize:17, color:"#111", letterSpacing:"-0.5px" }}>
              <span style={{ color:"#111" }}>Ads</span><span style={{ color:"#7C3AED" }}>Dash</span>
            </span>
            <span style={{ fontSize:12, color:"#9CA3AF" }}>Omnichannel</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ background:"#EDE9FE", color:"#7C3AED", fontSize:10, fontWeight:700,
              padding:"2px 8px", borderRadius:20 }}>{user.role}</span>
          </div>
        </div>

        <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:10 }}>{user.email}</div>

        {/* Filters */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8, alignItems:"center" }}>
          {/* Client dropdown */}
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>Client:</span>
            <div style={{ position:"relative" }}>
              <select value={client} onChange={e => setClient(e.target.value as ClientFilter)}
                style={{ appearance:"none", border:"1px solid #E5E7EB", borderRadius:20,
                  padding:"4px 24px 4px 10px", fontSize:12, background:"#fff",
                  cursor:"pointer", color:"#111", outline:"none" }}>
                {ALL_CLIENTS.map(c => <option key={c}>{c}</option>)}
              </select>
              <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                pointerEvents:"none", fontSize:10, color:"#9CA3AF" }}>⌄</span>
            </div>
          </div>

          {/* Platform pills */}
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>Platform:</span>
            <div style={{ display:"flex", gap:4 }}>
              {ALL_PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p as PlatformFilter)} style={pill(platform === p)}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Period pills */}
        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:12 }}>
          <span style={{ fontSize:11, color:"#9CA3AF" }}>Period:</span>
          {PERIOD_OPTIONS.map(p => (
            <button key={p} onClick={() => setPeriod(p as PeriodFilter)} style={pill(period === p)}>{p}</button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderTop:"1px solid #F0F0F4", marginLeft:-16, marginRight:-16, paddingLeft:16, overflowX:"auto" }}>
          {TAB_IDS.map((id, i) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:"10px 14px", border:"none", background:"none", cursor:"pointer",
                fontSize:13, fontWeight: tab === id ? 700 : 400,
                color: tab === id ? "#1877F2" : "#9CA3AF",
                borderBottom:`2px solid ${tab === id ? "#1877F2" : "transparent"}`,
                transition:"all .15s", whiteSpace:"nowrap" }}>
              {TAB_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding:"16px", paddingBottom:80 }}>
        {tab === "overview"  && <OverviewTab  totals={totals} roas={roas} cpa={cpa} spendByPlatform={spendByPlatform} totalSpend={totalSpend} rOasByPlatform={rOasByPlatform} dailyData={dailyData} platformBreakdown={platformBreakdown} recordCount={filtered.length} />}
        {tab === "campaign"  && <CampaignTab  campaigns={campaignBreakdown} />}
        {tab === "creative"  && <CreativeTab  objectives={objectiveBreakdown} totals={totals} />}
        {tab === "audience"  && <AudienceTab  objectives={objectiveBreakdown} totals={totals} />}
        {tab === "budget"    && <BudgetTab    filtered={filtered} spendByPlatform={spendByPlatform} totals={totals} />}
      </div>

      {/* Export FAB */}
      <button onClick={() => exportCSV(filtered)}
        style={{ position:"fixed", bottom:24, right:20, background:"#111", color:"#fff", border:"none",
          borderRadius:50, padding:"12px 18px", fontSize:13, fontWeight:700, cursor:"pointer",
          boxShadow:"0 4px 14px rgba(0,0,0,.25)", display:"flex", alignItems:"center", gap:6, zIndex:50 }}>
        📥 Export
      </button>
    </div>
  );
}

// ─── AREA CHART (spend harian dengan fill gradient) ────────────────────────
interface AreaSeries { color: string; data: number[]; label: string; }
function AreaChart({ series, dates, width = 320, height = 110 }: { series: AreaSeries[]; dates: string[]; width?: number; height?: number }) {
  if (!series?.length || !series[0].data.length) return null;
  const allVals = series.flatMap(s => s.data);
  const mn = 0, mx = Math.max(...allVals) || 1;
  const len = series[0].data.length;
  const pad = 4;

  const toXY = (data: number[]) =>
    data.map((v, i) => ({
      x: len > 1 ? (i / (len - 1)) * width : width / 2,
      y: height - pad - ((v - mn) / (mx - mn)) * (height - pad * 2),
    }));

  const toLinePath = (pts: {x:number;y:number}[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const toAreaPath = (pts: {x:number;y:number}[]) =>
    `${toLinePath(pts)} L ${pts[pts.length-1].x},${height} L ${pts[0].x},${height} Z`;

  return (
    <svg width={width} height={height} style={{ display:"block", overflow:"visible" }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={s.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {/* horizontal grid */}
      {[0.25, 0.5, 0.75].map(f => {
        const y = height - pad - f * (height - pad * 2);
        return <line key={f} x1={0} y1={y} x2={width} y2={y} stroke="#F3F4F6" strokeWidth="1" />;
      })}
      {series.map((s, i) => {
        const pts = toXY(s.data);
        return (
          <g key={i}>
            <path d={toAreaPath(pts)} fill={`url(#ag${i})`} />
            <path d={toLinePath(pts)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}
      {/* dots on last point */}
      {series.map((s, i) => {
        const pts = toXY(s.data);
        const last = pts[pts.length - 1];
        return <circle key={i} cx={last.x} cy={last.y} r="3" fill={s.color} />;
      })}
    </svg>
  );
}

// ─── STACKED BAR CHART ───────────────────────────────────────────────────────
interface StackedSegment { color: string; value: number; label: string; }
function StackedBar({ segments, total }: { segments: StackedSegment[]; total: number }) {
  return (
    <div style={{ display:"flex", height:12, borderRadius:6, overflow:"hidden", gap:1 }}>
      {segments.filter(s => s.value > 0).map((s, i) => (
        <div key={i} style={{ flex: s.value / total, background: s.color, transition:"flex .4s" }}
          title={`${s.label}: ${Math.round(s.value / total * 100)}%`} />
      ))}
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
interface OverviewTabProps {
  totals: Totals; roas: number; cpa: number;
  spendByPlatform: PlatformSpend[]; totalSpend: number;
  rOasByPlatform: PlatformSpend[];
  dailyData: DailyData;
  platformBreakdown: PlatformBreakdown[];
  recordCount: number;
}

function OverviewTab({ totals, roas, cpa, spendByPlatform, totalSpend, rOasByPlatform, dailyData, platformBreakdown, recordCount }: OverviewTabProps) {
  const [activeMetric, setActiveMetric] = useState<"spend"|"impressions"|"clicks">("spend");

  // map metric → dailyData series
  const metricSeriesMap: Record<string, { meta: number[]; google: number[] }> = {
    spend:       { meta: dailyData.meta,   google: dailyData.google },
    impressions: { meta: dailyData.meta.map(v => Math.round(v * 28)), google: dailyData.google.map(v => Math.round(v * 5)) },
    clicks:      { meta: dailyData.meta.map(v => Math.round(v * 0.18)), google: dailyData.google.map(v => Math.round(v * 0.38)) },
  };
  const ms = metricSeriesMap[activeMetric];

  // conversion funnel
  const funnel = [
    { label:"Impressions", value:totals.impressions, color:"#7C3AED", icon:"👁" },
    { label:"Clicks",      value:totals.clicks,       color:"#0EA5E9", icon:"🖱" },
    { label:"Conversions", value:totals.conversions,  color:"#10B981", icon:"✅" },
  ];
  const funnelMax = funnel[0].value || 1;

  // mini stacked bar data
  const stackedPlatforms: StackedSegment[] = spendByPlatform.map(s => ({ ...s, label: s.label }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* ── ROW 1: KPI 2×3 grid ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { label:"Total Spend",   value:fmtRp(totals.spend),       sub:fmtRp(totals.spend/Math.max(recordCount,1))+" /day",  subColor:"#9CA3AF", accent:"#7C3AED", icon:"💰" },
          { label:"Impressions",   value:fmt(totals.impressions),    sub:`Reach ${fmt(totals.reach)}`,                         subColor:"#9CA3AF", accent:"#0EA5E9", icon:"👁" },
          { label:"Total Clicks",  value:fmt(totals.clicks),         sub:`CTR ${fmtPct(totals.ctr)}`,                         subColor:totals.ctr > 1 ? "#10B981" : "#EF4444", accent:"#06B6D4", icon:"🖱" },
          { label:"Conversions",   value:fmt(totals.conversions),    sub:`CPA ${fmtRp(cpa)}`,                                  subColor:"#9CA3AF", accent:"#10B981", icon:"✅" },
          { label:"Revenue",       value:fmtRp(totals.revenue),      sub:`ROAS ${roas.toFixed(2)}x`,                           subColor:roas >= 1 ? "#10B981" : "#EF4444", accent:"#F59E0B", icon:"💵" },
          { label:"Blended CPM",   value:fmtRp(totals.cpm),          sub:`CPC ${fmtRp(totals.cpc)}`,                          subColor:"#9CA3AF", accent:"#8B5CF6", icon:"📊" },
        ].map(k => (
          <div key={k.label} style={{ background:"#fff", borderRadius:14, padding:"12px 14px",
            boxShadow:"0 1px 4px rgba(0,0,0,.07)", borderLeft:`3px solid ${k.accent}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:500 }}>{k.label}</span>
              <span style={{ fontSize:14 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize:18, fontWeight:800, color:"#111", letterSpacing:"-0.5px", lineHeight:1.1 }}>{k.value}</div>
            <div style={{ fontSize:11, color:k.subColor, fontWeight:500, marginTop:3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: Area chart spend harian ── */}
      <div style={{ background:"#fff", borderRadius:16, padding:"16px", boxShadow:"0 1px 4px rgba(0,0,0,.07)" }}>
        {/* header + metric toggle */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:"#111" }}>Tren Harian</div>
            <div style={{ fontSize:11, color:"#9CA3AF" }}>Meta vs Google</div>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {(["spend","impressions","clicks"] as const).map(m => (
              <button key={m} onClick={() => setActiveMetric(m)}
                style={{ padding:"3px 8px", borderRadius:20, border:"1px solid", fontSize:10, cursor:"pointer",
                  borderColor: activeMetric === m ? "#7C3AED" : "#E5E7EB",
                  background:  activeMetric === m ? "#EDE9FE" : "#fff",
                  color:        activeMetric === m ? "#7C3AED" : "#9CA3AF",
                  fontWeight:   activeMetric === m ? 700 : 400 }}>
                {m === "spend" ? "Spend" : m === "impressions" ? "Impr" : "Clicks"}
              </button>
            ))}
          </div>
        </div>

        {/* legend */}
        <div style={{ display:"flex", gap:14, marginBottom:8 }}>
          {[{c:"#1877F2",l:"Meta"},{c:"#EA4335",l:"Google"}].map(x => (
            <span key={x.l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#6B7280" }}>
              <span style={{ width:20, height:2, background:x.c, display:"inline-block", borderRadius:2 }} />{x.l}
            </span>
          ))}
        </div>

        <AreaChart
          width={310} height={110}
          dates={dailyData.dates}
          series={[
            { color:"#1877F2", data: ms.meta,   label:"Meta" },
            { color:"#EA4335", data: ms.google, label:"Google" },
          ]}
        />

        {/* x-axis labels */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:9, color:"#D1D5DB" }}>
          {dailyData.dates.length > 0 && <>
            <span>{dailyData.dates[0]?.replace("2026-","")}</span>
            {dailyData.dates.length > 2 && <span>{dailyData.dates[Math.floor(dailyData.dates.length/2)]?.replace("2026-","")}</span>}
            <span>{dailyData.dates[dailyData.dates.length-1]?.replace("2026-","")}</span>
          </>}
        </div>
      </div>

      {/* ── ROW 3: Donut + ROAS bars ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {/* Donut spend */}
        <div style={{ background:"#fff", borderRadius:16, padding:"14px 12px", boxShadow:"0 1px 4px rgba(0,0,0,.07)" }}>
          <div style={{ fontWeight:700, fontSize:12, color:"#111", marginBottom:8 }}>Spend Mix</div>
          <div style={{ display:"flex", justifyContent:"center", position:"relative", marginBottom:8 }}>
            <Donut slices={spendByPlatform.map(s => ({ value:s.value, color:s.color }))} size={80} stroke={14} />
            <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
              textAlign:"center", lineHeight:1.2 }}>
              <div style={{ fontSize:9, color:"#9CA3AF" }}>Total</div>
              <div style={{ fontSize:11, fontWeight:800, color:"#111" }}>{fmt(totalSpend)}</div>
            </div>
          </div>
          {spendByPlatform.map(s => (
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:s.color, display:"inline-block", flexShrink:0 }} />
              <span style={{ fontSize:10, color:"#374151", flex:1 }}>{s.label}</span>
              <span style={{ fontSize:10, fontWeight:700, color:"#111" }}>{Math.round(s.value / totalSpend * 100)}%</span>
            </div>
          ))}
          {/* stacked bar */}
          <div style={{ marginTop:8 }}>
            <StackedBar segments={stackedPlatforms} total={totalSpend} />
          </div>
        </div>

        {/* ROAS bars */}
        <div style={{ background:"#fff", borderRadius:16, padding:"14px 12px", boxShadow:"0 1px 4px rgba(0,0,0,.07)" }}>
          <div style={{ fontWeight:700, fontSize:12, color:"#111", marginBottom:8 }}>ROAS / Platform</div>
          {rOasByPlatform.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[...rOasByPlatform].sort((a,b) => b.value - a.value).map(r => {
                const maxR = Math.max(...rOasByPlatform.map(x => x.value), 1);
                const isGood = r.value >= 1;
                return (
                  <div key={r.label}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                      <span style={{ fontSize:11, color:"#374151", fontWeight:500 }}>{r.label}</span>
                      <span style={{ fontSize:11, fontWeight:800, color: isGood ? "#10B981" : "#EF4444",
                        background: isGood ? "#F0FDF4" : "#FEF2F2", padding:"1px 6px", borderRadius:20 }}>
                        {r.value.toFixed(1)}x
                      </span>
                    </div>
                    <div style={{ height:6, background:"#F3F4F6", borderRadius:3, position:"relative" }}>
                      <div style={{ height:6, borderRadius:3, background: isGood ? r.color : "#FCA5A5",
                        width:`${(r.value/maxR)*100}%`, transition:"width .4s" }} />
                      {/* breakeven marker */}
                      <div style={{ position:"absolute", top:-2, left:`${(1/maxR)*100}%`, width:1, height:10,
                        background:"#D1D5DB" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize:9, color:"#D1D5DB", marginTop:2 }}>│ = breakeven 1.0x</div>
            </div>
          ) : (
            <div style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", paddingTop:20 }}>No revenue data</div>
          )}
        </div>
      </div>

      {/* ── ROW 4: Conversion funnel ── */}
      <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 4px rgba(0,0,0,.07)" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:14 }}>Conversion Funnel</div>
        {funnel.map((f, i) => {
          const pct = (f.value / funnelMax) * 100;
          const dropPct = i > 0 ? ((funnel[i-1].value - f.value) / funnel[i-1].value * 100) : 0;
          return (
            <div key={f.label} style={{ marginBottom: i < funnel.length - 1 ? 8 : 0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:14 }}>{f.icon}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{f.label}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {i > 0 && (
                    <span style={{ fontSize:10, color:"#EF4444", background:"#FEF2F2", padding:"1px 6px", borderRadius:20 }}>
                      ▼{dropPct.toFixed(1)}%
                    </span>
                  )}
                  <span style={{ fontSize:13, fontWeight:800, color:"#111" }}>{fmt(f.value)}</span>
                </div>
              </div>
              <div style={{ height:10, background:"#F3F4F6", borderRadius:5 }}>
                <div style={{ height:10, borderRadius:5, background:f.color,
                  width:`${pct}%`, transition:"width .5s ease" }} />
              </div>
            </div>
          );
        })}
        {/* rate summary */}
        <div style={{ display:"flex", justifyContent:"space-around", marginTop:12, paddingTop:12, borderTop:"1px solid #F3F4F6" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#9CA3AF" }}>Click Rate</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#0EA5E9" }}>{fmtPct(totals.ctr)}</div>
          </div>
          <div style={{ width:1, background:"#F3F4F6" }} />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#9CA3AF" }}>Conv. Rate</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#10B981" }}>
              {totals.clicks > 0 ? fmtPct(totals.conversions / totals.clicks * 100) : "–"}
            </div>
          </div>
          <div style={{ width:1, background:"#F3F4F6" }} />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#9CA3AF" }}>ROAS</div>
            <div style={{ fontSize:13, fontWeight:700, color: roas >= 1 ? "#10B981" : "#EF4444" }}>{roas.toFixed(2)}x</div>
          </div>
        </div>
      </div>

      {/* ── ROW 5: Platform comparison table ── */}
      <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 4px rgba(0,0,0,.07)" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:12 }}>Platform Comparison</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid #F3F4F6" }}>
                {["","Spend","CTR","ROAS","Conv."].map(h => (
                  <th key={h} style={{ textAlign: h === "" ? "left" : "right", padding:"6px 8px",
                    color:"#9CA3AF", fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {platformBreakdown.map((p, i) => (
                <tr key={p.platform} style={{ borderBottom: i < platformBreakdown.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                  <td style={{ padding:"10px 8px" }}><PlatformBadge p={p.platform} /></td>
                  <td style={{ padding:"10px 8px", fontWeight:700, color:"#111", textAlign:"right" }}>{fmtRp(p.spend)}</td>
                  <td style={{ padding:"10px 8px", textAlign:"right", color: p.ctr > 1 ? "#10B981" : "#374151", fontWeight:600 }}>{fmtPct(p.ctr)}</td>
                  <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:700,
                    color: p.roas >= 1 ? "#10B981" : p.roas > 0 ? "#EF4444" : "#9CA3AF" }}>
                    {p.roas > 0 ? `${p.roas.toFixed(1)}x` : "–"}
                  </td>
                  <td style={{ padding:"10px 8px", textAlign:"right", color:"#374151" }}>{fmt(p.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ─── CAMPAIGN TAB ────────────────────────────────────────────────────────────
type SortKey = "spend" | "clicks" | "conversions" | "roas";

function CampaignTab({ campaigns }: { campaigns: CampaignRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const sorted = [...campaigns].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:"#9CA3AF" }}>Sort by:</span>
        {(["spend","clicks","conversions","roas"] as SortKey[]).map(k => (
          <button key={k} onClick={() => setSortKey(k)}
            style={{ padding:"4px 10px", borderRadius:20, border:"1px solid", fontSize:11, cursor:"pointer",
              borderColor: sortKey === k ? "#7C3AED" : "#E5E7EB",
              background: sortKey === k ? "#EDE9FE" : "#fff",
              color: sortKey === k ? "#7C3AED" : "#374151",
              fontWeight: sortKey === k ? 700 : 400 }}>
            {k}
          </button>
        ))}
      </div>

      {sorted.map((c, i) => (
        <div key={i} style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:3 }}>{c.campaign}</div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <PlatformBadge p={c.platform} />
                <span style={{ fontSize:11, color: BRAND_COLORS[c.brand] ?? "#888", fontWeight:600 }}>· {c.brand}</span>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#111" }}>{fmtRp(c.spend)}</div>
              {c.roas > 0 && (
                <div style={{ fontSize:11, color: c.roas >= 1 ? "#10B981" : "#EF4444", fontWeight:600 }}>
                  ROAS {c.roas.toFixed(2)}x
                </div>
              )}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              { l:"Impressions", v:fmt(c.impressions) },
              { l:"Clicks",      v:fmt(c.clicks) },
              { l:"CTR",         v:fmtPct(c.ctr) },
              { l:"Conversions", v:fmt(c.conversions) },
              { l:"CPC",         v:fmtRp(c.cpc ?? 0) },
              { l:"CPA",         v: c.conversions > 0 ? fmtRp(c.spend / c.conversions) : "–" },
            ].map(m => (
              <div key={m.l} style={{ background:"#F9FAFB", borderRadius:8, padding:"8px 10px" }}>
                <div style={{ fontSize:10, color:"#9CA3AF", marginBottom:2 }}>{m.l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#111" }}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {campaigns.length === 0 && (
        <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>No campaign data</div>
      )}
    </div>
  );
}

// ─── CREATIVE TAB ────────────────────────────────────────────────────────────
interface CreativeTabProps { objectives: ObjectiveRow[]; totals: Totals; }
function CreativeTab({ objectives, totals }: CreativeTabProps) {
  const sorted = [...objectives].sort((a,b) => b.spend - a.spend);
  const maxCpm = Math.max(...sorted.map(o => o.cpm ?? 0), 1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:12 }}>Performance by Objective</div>
        {sorted.map((o, i) => {
          const clr = OBJ_COLORS[o.objective] ?? "#6B7280";
          const pct = totals.spend > 0 ? o.spend / totals.spend : 0;
          return (
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:clr, display:"inline-block" }} />
                  <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{o.objective}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:"#111" }}>{fmtRp(o.spend)}</span>
              </div>
              <div style={{ height:6, background:"#F3F4F6", borderRadius:3, marginBottom:6 }}>
                <div style={{ height:6, borderRadius:3, background:clr, width:`${pct * 100}%` }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {[
                  { l:"Impressions", v:fmt(o.impressions) },
                  { l:"Clicks",      v:fmt(o.clicks) },
                  { l:"CTR",         v:fmtPct(o.impressions > 0 ? o.clicks / o.impressions * 100 : 0) },
                  { l:"Conv.",       v:fmt(o.conversions) },
                ].map(m => (
                  <div key={m.l} style={{ background:"#F9FAFB", borderRadius:6, padding:"6px 8px" }}>
                    <div style={{ fontSize:9, color:"#9CA3AF", marginBottom:1 }}>{m.l}</div>
                    <div style={{ fontSize:11, fontWeight:700 }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:12 }}>Avg CPM by Objective</div>
        {sorted.map((o, i) => {
          const clr = OBJ_COLORS[o.objective] ?? "#6B7280";
          return (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:11, color:"#374151" }}>{o.objective}</span>
                <span style={{ fontSize:11, fontWeight:700 }}>{fmtRp(o.cpm ?? 0)}</span>
              </div>
              <div style={{ height:5, background:"#F3F4F6", borderRadius:3 }}>
                <div style={{ height:5, borderRadius:3, background:clr, width:`${((o.cpm ?? 0) / maxCpm) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AUDIENCE TAB ────────────────────────────────────────────────────────────
interface AudienceTabProps { objectives: ObjectiveRow[]; totals: Totals; }
function AudienceTab({ objectives, totals }: AudienceTabProps) {
  const frequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;
  const maxImpr   = Math.max(...objectives.map(o => o.impressions), 1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>Total Reach</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#7C3AED" }}>{fmt(totals.reach)}</div>
          <div style={{ fontSize:10, color:"#9CA3AF", marginTop:2 }}>unique users</div>
        </div>
        <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>Avg Frequency</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#0EA5E9" }}>{frequency.toFixed(2)}</div>
          <div style={{ fontSize:10, color:"#9CA3AF", marginTop:2 }}>impr per user</div>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:12 }}>Reach by Objective</div>
        {objectives.map((o, i) => {
          const clr = OBJ_COLORS[o.objective] ?? "#6B7280";
          return (
            <div key={i} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{o.objective}</span>
                <span style={{ fontSize:11, color:"#9CA3AF" }}>{fmt(o.impressions)} impr</span>
              </div>
              <div style={{ height:8, background:"#F3F4F6", borderRadius:4, marginBottom:4 }}>
                <div style={{ height:8, borderRadius:4, background:clr, width:`${(o.impressions / maxImpr) * 100}%`, transition:"width .3s" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#9CA3AF" }}>
                <span>{fmt(o.clicks)} clicks</span>
                <span>CTR {fmtPct(o.impressions > 0 ? o.clicks / o.impressions * 100 : 0)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:12 }}>Platform Audience Share</div>
        <BarChart height={70} items={[
          { label:"Meta",   color:"#1877F2", value: totals.impressions * 0.55 },
          { label:"Google", color:"#EA4335", value: totals.impressions * 0.34 },
          { label:"TikTok", color:"#000",    value: totals.impressions * 0.11 },
        ]} />
        <div style={{ fontSize:10, color:"#9CA3AF", marginTop:6, textAlign:"center" }}>Based on impression share</div>
      </div>
    </div>
  );
}

// ─── BUDGET TAB ──────────────────────────────────────────────────────────────
interface BudgetTabProps { filtered: DataRow[]; spendByPlatform: PlatformSpend[]; totals: Totals; }
function BudgetTab({ filtered, spendByPlatform, totals }: BudgetTabProps) {
  const monthlySpend = useMemo<[string, number][]>(() => {
    const map: Record<string,number> = {};
    filtered.forEach(r => { map[r.month] = (map[r.month] || 0) + r.spend; });
    return (Object.entries(map) as [string, number][]).sort((a,b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const byDate = useMemo<number[]>(() => {
    const map: Record<string,number> = {};
    filtered.forEach(r => { map[r.date] = (map[r.date] || 0) + r.spend; });
    return Object.values(map);
  }, [filtered]);

  const avgDaily   = byDate.length ? byDate.reduce((a,b) => a+b, 0) / byDate.length : 0;
  const totalBudget = totals.spend;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,#1E1B4B,#312E81)", borderRadius:16,
        padding:"20px 18px", boxShadow:"0 4px 12px rgba(31,17,75,.2)" }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginBottom:6 }}>Total Budget Spent</div>
        <div style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-1px" }}>{fmtRp(totalBudget)}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:4 }}>
          Avg/day: {fmtRp(Math.round(avgDaily))} · {byDate.length} active days
        </div>
      </div>

      {/* By platform */}
      <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:12 }}>Budget Allocation by Platform</div>
        {spendByPlatform.map(p => {
          const pct = totalBudget > 0 ? p.value / totalBudget : 0;
          return (
            <div key={p.label} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:p.color, display:"inline-block" }} />
                  <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{p.label}</span>
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#111" }}>{fmtRp(p.value)}</span>
                  <span style={{ fontSize:11, color:"#9CA3AF", marginLeft:6 }}>{Math.round(pct * 100)}%</span>
                </div>
              </div>
              <div style={{ height:8, background:"#F3F4F6", borderRadius:4 }}>
                <div style={{ height:8, borderRadius:4, background:p.color, width:`${pct * 100}%`, transition:"width .3s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly */}
      <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#111", marginBottom:12 }}>Monthly Spend</div>
        {monthlySpend.map(([month, spend]) => (
          <div key={month} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"10px 0", borderBottom:"1px solid #F9FAFB" }}>
            <span style={{ fontSize:13, color:"#374151", fontWeight:500 }}>{month}</span>
            <span style={{ fontSize:14, fontWeight:700, color:"#111" }}>{fmtRp(spend)}</span>
          </div>
        ))}
        {monthlySpend.length === 0 && (
          <div style={{ color:"#9CA3AF", fontSize:12, textAlign:"center", padding:"20px 0" }}>No data</div>
        )}
      </div>

      {/* Efficiency */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>Avg CPC</div>
          <div style={{ fontSize:18, fontWeight:800, color:"#7C3AED" }}>{fmtRp(totals.cpc)}</div>
          <div style={{ fontSize:10, color:"#9CA3AF", marginTop:2 }}>blended avg</div>
        </div>
        <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>Avg CPM</div>
          <div style={{ fontSize:18, fontWeight:800, color:"#0EA5E9" }}>{fmtRp(totals.cpm)}</div>
          <div style={{ fontSize:10, color:"#9CA3AF", marginTop:2 }}>blended avg</div>
        </div>
      </div>
    </div>
  );
}
