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
} from "@/generated/weather-ais";

export type MetarObservation = NonNullable<zod.infer<typeof getMetarResponseItem>>;
export type TafForecast = NonNullable<zod.infer<typeof getTafResponseItem>>;
export type SigmetAdvisory = NonNullable<zod.infer<typeof getSigmetResponseItem>>;
export type HubCurrentWeather = NonNullable<zod.infer<typeof getCurrentWeatherResponse>>;
export type HubForecastResponse = NonNullable<zod.infer<typeof getForecastResponse>>;
export type HubWeatherAlert = NonNullable<zod.infer<typeof getAlertsResponseItem>>;
export type HubGoNoGo = NonNullable<zod.infer<typeof getGoNoGoResponse>>;
export type NotamResponse = NonNullable<zod.infer<typeof getNotamsResponse>>;
export type AdsbResponse = NonNullable<zod.infer<typeof getAircraftResponse>>;
export type AdsbAircraft = NonNullable<NonNullable<AdsbResponse["aircraft"]>[number]>;
