import type zod from "zod";
import type {
    getMetarResponseItem,
    getTafResponseItem,
    getSigmetResponseItem,
    getCurrentWeatherResponse,
    getForecastResponse,
    getAlertsResponseItem,
    getGoNoGoResponse,
    getNotamsResponse,
    getAircraftResponse,
    getAirspacesResponse,
    getConfigResponse,
    checkPointsBody,
    checkPointsResponse,
} from "@/generated/weather-ais";

export const WEATHER_VERDICT = {
    GO: "GO",
    CAUTION: "CAUTION",
    NO_GO: "NO_GO",
} as const;

export type WeatherVerdict = (typeof WEATHER_VERDICT)[keyof typeof WEATHER_VERDICT];

export type MetarObservation = NonNullable<zod.infer<typeof getMetarResponseItem>>;
export type TafForecast = NonNullable<zod.infer<typeof getTafResponseItem>>;
export type SigmetAdvisory = NonNullable<zod.infer<typeof getSigmetResponseItem>>;
export type HubCurrentWeather = NonNullable<zod.infer<typeof getCurrentWeatherResponse>>;
export type HubForecastResponse = NonNullable<zod.infer<typeof getForecastResponse>>;
export type HubForecastHour = NonNullable<NonNullable<HubForecastResponse["hourly"]>[number]>;
export type HubWeatherAlert = NonNullable<zod.infer<typeof getAlertsResponseItem>>;
export type HubGoNoGo = NonNullable<zod.infer<typeof getGoNoGoResponse>>;
export type NotamResponse = NonNullable<zod.infer<typeof getNotamsResponse>>;
export type NotamItem = NonNullable<NonNullable<NotamResponse["notams"]>[number]>;
export type AdsbResponse = NonNullable<zod.infer<typeof getAircraftResponse>>;
export type AdsbAircraft = NonNullable<NonNullable<AdsbResponse["aircraft"]>[number]>;
export type OpenAipResponse = NonNullable<zod.infer<typeof getAirspacesResponse>>;
export type OpenAipAirspace = NonNullable<NonNullable<OpenAipResponse["airspaces"]>[number]>;
export type DagrConfig = NonNullable<zod.infer<typeof getConfigResponse>>;
export type DagrCheckPointsPayload = zod.infer<typeof checkPointsBody>;
export type DagrCheckPointsResponse = NonNullable<zod.infer<typeof checkPointsResponse>>;
