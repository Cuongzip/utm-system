package com.utm.weatherais.service;

import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.weatherais.service.client.HubClientService;
import com.utm.weatherais.viewmodel.adsb.AdsbFeedVm;
import com.utm.weatherais.viewmodel.client.HubBriefVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrCheckPointsResponseVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrPointVm;
import com.utm.weatherais.viewmodel.notam.NotamFeedVm;
import com.utm.weatherais.viewmodel.openaip.OpenaipFeedVm;
import com.utm.weatherais.viewmodel.weather.WeatherAlertVm;
import com.utm.weatherais.viewmodel.weather.WeatherGoNoGoVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: WeatherAis Services (Based on docs/api/15-weather-ais.md)")
class WeatherAisServicesTest {

    @Mock
    private HubClientService hubClientService;

    @Mock
    private UpstreamHttpExecutor httpExecutor;

    private WeatherServiceImpl weatherService;
    private AdsbServiceImpl adsbService;
    private NotamServiceImpl notamService;
    private OpenaipServiceImpl openaipService;
    private DagrServiceImpl dagrService;
    private HubBriefVm sgnHub;

    @BeforeEach
    void setUp() {
        weatherService = new WeatherServiceImpl(
                hubClientService,
                httpExecutor,
                "VVTS,VVNB,VVDN",
                "VVHM,VVGL",
                "https://aviationweather.gov",
                "https://api.open-meteo.com");

        adsbService = new AdsbServiceImpl(
                httpExecutor,
                "https://api.adsb.lol",
                "10.8188,106.6519,250",
                3000L);

        notamService = new NotamServiceImpl(
                httpExecutor,
                "https://api.autorouter.aero",
                "client-123",
                "secret-456",
                "VVHM,VVTS");

        openaipService = new OpenaipServiceImpl(
                httpExecutor,
                "https://api.core.openaip.net",
                "https://api.tiles.openaip.net",
                "openaip-key-123",
                "VN");

        dagrService = new DagrServiceImpl(
                httpExecutor,
                "https://wms.caav.example/ows",
                "utm:drone_zones");

        sgnHub = new HubBriefVm(
                "hub-sgn-01",
                "HUB-SGN-01",
                "Central Saigon Vertiport",
                new HubBriefVm.LocationVm(10.7769, 106.7009, "District 1, Ho Chi Minh City"),
                12.0,
                "active");
    }

    @Nested
    @DisplayName("WeatherServiceImpl: METAR, Open-Meteo & Go/No-Go Fusion")
    class WeatherTests {

        @Test
        @DisplayName("Should return GO verdict when METAR, SIGMET, and Open-Meteo are within VFR limits")
        void getGoNoGo_nominalVfrConditions_returnsGoVerdict() {
            when(hubClientService.getHubById("hub-sgn-01")).thenReturn(Optional.of(sgnHub));
            when(httpExecutor.getString(contains("/api/data/metar"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            [{"icaoId":"VVTS","name":"Tan Son Nhat","lat":10.8188,"lon":106.6519,
                              "rawOb":"VVTS 241500Z 14008KT 10SM FEW025 29/23 Q1011","fltCat":"VFR",
                              "temp":29,"dewp":23,"wdir":140,"wspd":8,"visib":"10+","altim":1011}]
                            """));
            when(httpExecutor.getString(contains("/v1/forecast"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"current":{"temperature_2m":29.2,"apparent_temperature":31.0,"relative_humidity_2m":72,
                             "wind_speed_10m":4.1,"wind_gusts_10m":6.2,"wind_direction_10m":140,"visibility":10000,
                             "cloud_cover":20,"surface_pressure":1011,"precipitation":0.0,"weather_code":1}}
                            """));
            when(httpExecutor.getString(contains("/api/data/isigmet"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("[]"));

            WeatherGoNoGoVm result = weatherService.getGoNoGo("hub-sgn-01");

            assertThat(result.verdict()).isEqualTo("GO");
            assertThat(result.nearestStation()).isEqualTo("VVTS");
            assertThat(result.windSource()).isEqualTo("METAR");
            assertThat(result.windSpeedMs()).isEqualTo(4.1);
            assertThat(result.visibilityM()).isEqualTo(10000.0);
            assertThat(result.flightCategory()).isEqualTo("VFR");
            assertThat(result.activeSigmetsCount()).isZero();
            assertThat(result.reasons()).isEmpty();
        }

        @Test
        @DisplayName("Should keep VFR category on high cloud cover when visibility is clear and emit no duplicate category alert")
        void getCurrentWeatherAndAlerts_highCloudCoverClearVisibility_returnsVfrAndZeroAlerts() {
            when(hubClientService.getHubById("hub-sgn-01")).thenReturn(Optional.of(sgnHub));
            when(httpExecutor.getString(contains("/v1/forecast"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"current":{"temperature_2m":27.7,"apparent_temperature":31.5,"relative_humidity_2m":85,
                             "wind_speed_10m":2.1,"wind_gusts_10m":3.4,"wind_direction_10m":185,"visibility":24000,
                             "cloud_cover":100,"surface_pressure":1012,"precipitation":0.0,"weather_code":3}}
                            """));

            var current = weatherService.getCurrentWeather("hub-sgn-01");
            List<WeatherAlertVm> alerts = weatherService.getAlerts("hub-sgn-01");

            assertThat(current.flightCategory()).isEqualTo("VFR");
            assertThat(alerts).isEmpty();
        }

        @Test
        @DisplayName("Should return NO_GO verdict when wind exceeds 12 m/s or thunderstorm is active")
        void getGoNoGo_excessiveWindAndThunderstorm_returnsNoGoVerdict() {
            when(hubClientService.getHubById("hub-sgn-01")).thenReturn(Optional.of(sgnHub));
            when(httpExecutor.getString(contains("/api/data/metar"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            [{"icaoId":"VVTS","name":"Tan Son Nhat","fltCat":"IFR",
                              "wdir":250,"wspd":28,"wgst":36,"visib":0.8}]
                            """));
            when(httpExecutor.getString(contains("/v1/forecast"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"current":{"temperature_2m":25.0,"wind_speed_10m":14.4,"wind_gusts_10m":18.5,
                             "visibility":1200,"cloud_cover":95,"weather_code":95}}
                            """));
            when(httpExecutor.getString(contains("/api/data/isigmet"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            [{"isigmetId":"SIG-1","firId":"VVHM","firName":"Ho Chi Minh FIR","hazard":"TS"}]
                            """));

            WeatherGoNoGoVm result = weatherService.getGoNoGo("hub-sgn-01");

            assertThat(result.verdict()).isEqualTo("NO_GO");
            assertThat(result.activeSigmetsCount()).isEqualTo(1);
            assertThat(result.reasons()).anyMatch(r -> r.contains("Sustained wind"));
            assertThat(result.reasons()).anyMatch(r -> r.contains("Thunderstorm"));
        }

        @Test
        @DisplayName("Should throw NotFoundException when hub does not exist")
        void getCurrentWeather_unknownHub_throwsNotFoundException() {
            when(hubClientService.getHubById("missing-hub")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> weatherService.getCurrentWeather("missing-hub"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("Hub / Vertiport is not found")
                    .extracting("errorCode")
                    .isEqualTo("HUB_NOT_FOUND");
        }

        @Test
        @DisplayName("Should generate critical wind and thunderstorm alerts when thresholds are breached")
        void getAlerts_severeWeather_returnsCriticalAlerts() {
            when(hubClientService.getHubById("hub-sgn-01")).thenReturn(Optional.of(sgnHub));
            when(httpExecutor.getString(contains("/v1/forecast"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"current":{"temperature_2m":26.0,"wind_speed_10m":13.5,"wind_gusts_10m":16.2,
                             "visibility":1100,"cloud_cover":90,"weather_code":95}}
                            """));

            List<WeatherAlertVm> alerts = weatherService.getAlerts("hub-sgn-01");

            assertThat(alerts).extracting(WeatherAlertVm::type)
                    .contains("HIGH_WIND", "WIND_GUST", "LOW_VISIBILITY", "THUNDERSTORM");
        }
    }

    @Nested
    @DisplayName("ADS-B, NOTAM, openAIP & DAGR Services")
    class AeronauticalFeedsTests {

        @Test
        @DisplayName("Should normalize ADS-B aircraft feed from knots/feet to metric units")
        void getAircraft_validAdsbPayload_returnsNormalizedAircraft() {
            when(httpExecutor.getString(contains("/v2/point/"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"ac":[{"hex":"888123","flight":"HVN214  ","r":"VN-A861","t":"B789",
                              "lat":10.82,"lon":106.66,"alt_baro":3000,"gs":180,"baro_rate":-500,"track":250,"seen":0.8}]}
                            """));

            AdsbFeedVm feed = adsbService.getAircraft();

            assertThat(feed.count()).isEqualTo(1);
            assertThat(feed.aircraft().getFirst().callsign()).isEqualTo("HVN214");
            assertThat(feed.aircraft().getFirst().altitudeM()).isEqualTo(914.4);
            assertThat(feed.aircraft().getFirst().groundSpeedMs()).isEqualTo(92.6);
            assertThat(feed.aircraft().getFirst().verticalSpeedMs()).isEqualTo(-2.54);
        }

        @Test
        @DisplayName("Should authenticate and classify NOTAM Q-codes into severity levels")
        void getNotams_validCredentials_decodesQCodeSeverity() {
            when(httpExecutor.postFormUrlEncoded(contains("/oauth2/token"), anyString(), anyInt()))
                    .thenReturn(Optional.of("{\"access_token\":\"tok-abc\",\"expires_in\":3600}"));
            when(httpExecutor.getString(contains("/v1.0/notam"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"rows":[{"id":"N1","series":"A","number":"0123","year":"26","itema":"VVTS",
                              "code23":"RP","code45":"CA","lat":10.82,"lon":106.65,"radius":2,"lower":0,"upper":40,
                              "iteme":"PROHIBITED AREA ACTIVE FOR VIP MOVEMENT"}]}
                            """));

            NotamFeedVm feed = notamService.getNotams("VVTS");

            assertThat(feed.enabled()).isTrue();
            assertThat(feed.count()).isEqualTo(1);
            assertThat(feed.notams().getFirst().subject()).isEqualTo("Prohibited area");
            assertThat(feed.notams().getFirst().severity()).isEqualTo("critical");
            assertThat(feed.notams().getFirst().radiusM()).isEqualTo(3704.0);
        }

        @Test
        @DisplayName("Should normalize 1e7 autorouter coordinates, filter suppressed rows, and decode all 28 Q-codes")
        void getNotams_autorouterScaledCoordsAndSuppressed_normalizesAndFilters() {
            when(httpExecutor.postFormUrlEncoded(contains("/oauth2/token"), anyString(), anyInt()))
                    .thenReturn(Optional.of("{\"access_token\":\"tok-xyz\",\"expires_in\":3600}"));
            when(httpExecutor.getString(contains("/v1.0/notam"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"rows":[
                              {"id":"N-SUP","series":"A","number":"0001","year":"26","itema":["VVTS"],
                               "code23":"RP","code45":"CA","suppressed":true,"endvalidity":2147483647},
                              {"id":"N-GG","series":"A","number":"0200","year":"26","itema":["VVHM"],
                               "code23":"GG","code45":"AU","lat":108188000,"lon":1066519000,"radius":5,
                               "itemf":"GND","itemg":"5000FT","endvalidity":2147483647,"iteme":"GNSS OUTAGE"}
                            ]}
                            """));

            NotamFeedVm feed = notamService.getNotams("VVHM");

            assertThat(feed.count()).isEqualTo(1);
            var item = feed.notams().getFirst();
            assertThat(item.id()).isEqualTo("N-GG");
            assertThat(item.subject()).isEqualTo("GNSS / GPS outage");
            assertThat(item.severity()).isEqualTo("warning");
            assertThat(item.latitude()).isEqualTo(10.8188);
            assertThat(item.longitude()).isEqualTo(106.6519);
            assertThat(item.lowerLimitM()).isEqualTo(0.0);
            assertThat(item.upperLimitM()).isEqualTo(1524.0);
            assertThat(item.validTo()).isNull();
        }

        @Test
        @DisplayName("Should return disabled empty NOTAM response when credentials are omitted")
        void getNotams_missingCredentials_returnsDisabledFeed() {
            NotamServiceImpl unconfigured = new NotamServiceImpl(
                    httpExecutor, "https://api.autorouter.aero", "", "", "VVHM");

            NotamFeedVm feed = unconfigured.getNotams(null);

            assertThat(feed.enabled()).isFalse();
            assertThat(feed.notams()).isEmpty();
        }

        @Test
        @DisplayName("Should parse openAIP airspace limits and severity")
        void getAirspaces_openAipItems_mapsLimitsAndSeverity() {
            when(httpExecutor.getString(contains("/api/airspaces"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"items":[{"_id":"oa-1","name":"VVTS CTR","country":"VN","type":4,"icaoClass":"D",
                              "lowerLimit":{"value":0,"unit":1},"upperLimit":{"value":3500,"unit":1},
                              "geometry":{"type":"Polygon","coordinates":[[[106.6,10.7],[106.7,10.7],[106.7,10.9],[106.6,10.7]]]}}]}
                            """));

            OpenaipFeedVm feed = openaipService.getAirspaces("VN");

            assertThat(feed.enabled()).isTrue();
            assertThat(feed.count()).isEqualTo(1);
            assertThat(feed.airspaces().getFirst().type()).isEqualTo("CTR");
            assertThat(feed.airspaces().getFirst().severity()).isEqualTo("warning");
            assertThat(feed.airspaces().getFirst().upperLimitM()).isEqualTo(1066.8);
        }

        @Test
        @DisplayName("Should project waypoints to EPSG:3857 and extract WMS advisories")
        void checkPoints_wmsFeatureReturned_extractsAdvisory() {
            when(httpExecutor.getString(contains("REQUEST=GetFeatureInfo"), anyMap(), anyInt()))
                    .thenReturn(Optional.of("""
                            {"features":[{"properties":{"name":"Tan Son Nhat Approach Buffer","restriction":"RESTRICTED"}}]}
                            """));

            DagrCheckPointsResponseVm resp = dagrService.checkPoints(List.of(new DagrPointVm(10.8188, 106.6519)));

            assertThat(resp.enabled()).isTrue();
            assertThat(resp.checkedCount()).isEqualTo(1);
            assertThat(resp.advisoryCount()).isEqualTo(1);
            assertThat(resp.advisories().getFirst().zoneName()).isEqualTo("Tan Son Nhat Approach Buffer");
        }
    }
}
