import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    MetarObservation,
    TafForecast,
    SigmetAdvisory,
    HubCurrentWeather,
    HubForecastResponse,
    HubWeatherAlert,
    HubGoNoGo,
    NotamResponse,
    AdsbResponse,
} from "@/types";

export const weatherAisService = {
    getMetar: async (ids?: string): Promise<MetarObservation[]> => {
        const url = buildUrl(API_ENDPOINTS.WEATHER_AIS.METAR, ids ? { ids } : undefined);
        return apiClient<MetarObservation[]>(url);
    },

    getTaf: async (ids?: string): Promise<TafForecast[]> => {
        const url = buildUrl(API_ENDPOINTS.WEATHER_AIS.TAF, ids ? { ids } : undefined);
        return apiClient<TafForecast[]>(url);
    },

    getSigmet: async (fir?: string): Promise<SigmetAdvisory[]> => {
        const url = buildUrl(API_ENDPOINTS.WEATHER_AIS.SIGMET, fir ? { fir } : undefined);
        return apiClient<SigmetAdvisory[]>(url);
    },

    getHubCurrentWeather: async (hubId: string): Promise<HubCurrentWeather> => {
        return apiClient<HubCurrentWeather>(API_ENDPOINTS.WEATHER_AIS.CURRENT(hubId));
    },

    getHubForecast: async (hubId: string): Promise<HubForecastResponse> => {
        return apiClient<HubForecastResponse>(API_ENDPOINTS.WEATHER_AIS.FORECAST(hubId));
    },

    getHubAlerts: async (hubId: string): Promise<HubWeatherAlert[]> => {
        return apiClient<HubWeatherAlert[]>(API_ENDPOINTS.WEATHER_AIS.ALERTS(hubId));
    },

    getHubGoNoGo: async (hubId: string): Promise<HubGoNoGo> => {
        return apiClient<HubGoNoGo>(API_ENDPOINTS.WEATHER_AIS.GO_NO_GO(hubId));
    },

    getNotams: async (icaos?: string): Promise<NotamResponse> => {
        const url = buildUrl(API_ENDPOINTS.WEATHER_AIS.NOTAM, icaos ? { icaos } : undefined);
        return apiClient<NotamResponse>(url);
    },

    getAdsbAircraft: async (): Promise<AdsbResponse> => {
        return apiClient<AdsbResponse>(API_ENDPOINTS.WEATHER_AIS.ADSB_AIRCRAFT);
    },
};
