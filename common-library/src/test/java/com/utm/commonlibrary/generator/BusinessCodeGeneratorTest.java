package com.utm.commonlibrary.generator;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Unit Tests: BusinessCodeGenerator")
class BusinessCodeGeneratorTest {

    private static final String SAFE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    @Nested
    @DisplayName("Predefined Rule Generation Tests")
    class PredefinedRulesTests {

        @Test
        @DisplayName("generate with FLIGHT_NUMBER produces valid format FLT-YYYYMMDD-XXXX")
        void generate_flightNumberRule_producesCorrectFormat() {
            String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
            String code = BusinessCodeGenerator.generate(CodePatternRule.FLIGHT_NUMBER);

            assertThat(code).isNotNull().startsWith("FLT-" + today + "-");
            String[] parts = code.split("-");
            assertThat(parts).hasSize(3);
            assertThat(parts[0]).isEqualTo("FLT");
            assertThat(parts[1]).isEqualTo(today);
            assertThat(parts[2]).hasSize(4);
            assertThat(parts[2]).matches("[" + SAFE_ALPHABET + "]{4}");
        }

        @Test
        @DisplayName("generate with HUB_CODE produces valid format HUB-XXXX")
        void generate_hubCodeRule_producesCorrectFormat() {
            String code = BusinessCodeGenerator.generate(CodePatternRule.HUB_CODE);

            assertThat(code).isNotNull().startsWith("HUB-");
            String[] parts = code.split("-");
            assertThat(parts).hasSize(2);
            assertThat(parts[0]).isEqualTo("HUB");
            assertThat(parts[1]).hasSize(4);
        }

        @Test
        @DisplayName("generate with MISSION_CODE produces valid format MSN-YYMMDD-XXXX")
        void generate_missionCodeRule_producesCorrectFormat() {
            String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
            String code = BusinessCodeGenerator.generate(CodePatternRule.MISSION_CODE);

            assertThat(code).isNotNull().startsWith("MSN-" + datePart + "-");
        }

        @Test
        @DisplayName("generate with EMERGENCY_INCIDENT produces valid format INC-YYYYMMDD-XXXX")
        void generate_emergencyIncidentRule_producesCorrectFormat() {
            String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
            String code = BusinessCodeGenerator.generate(CodePatternRule.EMERGENCY_INCIDENT);

            assertThat(code).isNotNull().startsWith("INC-" + today + "-");
        }

        @Test
        @DisplayName("generate with DRONE_REGISTRATION produces valid format DRN-YYYY-XXXX")
        void generate_droneRegistrationRule_producesCorrectFormat() {
            String year = String.valueOf(LocalDate.now().getYear());
            String code = BusinessCodeGenerator.generate(CodePatternRule.DRONE_REGISTRATION);

            assertThat(code).isNotNull().startsWith("DRN-" + year + "-");
            String[] parts = code.split("-");
            assertThat(parts).hasSize(3);
            assertThat(parts[0]).isEqualTo("DRN");
            assertThat(parts[1]).isEqualTo(year);
            assertThat(parts[2]).hasSize(4);
        }

        @Test
        @DisplayName("generate with ORGANIZATION_REGISTRATION produces valid format ORG-YYYY-XXXX")
        void generate_organizationRegistrationRule_producesCorrectFormat() {
            String year = String.valueOf(LocalDate.now().getYear());
            String code = BusinessCodeGenerator.generate(CodePatternRule.ORGANIZATION_REGISTRATION);

            assertThat(code).isNotNull().startsWith("ORG-" + year + "-");
            String[] parts = code.split("-");
            assertThat(parts).hasSize(3);
            assertThat(parts[0]).isEqualTo("ORG");
            assertThat(parts[1]).isEqualTo(year);
            assertThat(parts[2]).hasSize(4);
        }

        @Test
        @DisplayName("generate with DEVICE_IDENTIFIER produces valid format DEV-XXXXXXXX")
        void generate_deviceIdentifierRule_producesCorrectFormat() {
            String code = BusinessCodeGenerator.generate(CodePatternRule.DEVICE_IDENTIFIER);

            assertThat(code).isNotNull().startsWith("DEV-");
            String[] parts = code.split("-");
            assertThat(parts).hasSize(2);
            assertThat(parts[0]).isEqualTo("DEV");
            assertThat(parts[1]).hasSize(8);
            assertThat(parts[1]).matches("[" + SAFE_ALPHABET + "]{8}");
        }

        @Test
        @DisplayName("generate with AIRSPACE_ZONE produces valid format ASZ-XXXX")
        void generate_airspaceZoneRule_producesCorrectFormat() {
            String code = BusinessCodeGenerator.generate(CodePatternRule.AIRSPACE_ZONE);

            assertThat(code).isNotNull().startsWith("ASZ-");
            String[] parts = code.split("-");
            assertThat(parts).hasSize(2);
            assertThat(parts[0]).isEqualTo("ASZ");
            assertThat(parts[1]).hasSize(4);
            assertThat(parts[1]).matches("[" + SAFE_ALPHABET + "]{4}");
        }
    }

    @Nested
    @DisplayName("Custom Rules & Formatting Tests")
    class CustomRulesTests {

        @Test
        @DisplayName("generate with custom rule withPrefix applies new prefix cleanly")
        void generate_withPrefix_customizesRule() {
            CodePatternRule customRule = CodePatternRule.HUB_CODE.withPrefix("HUB-SGN");
            String code = BusinessCodeGenerator.generate(customRule);

            assertThat(code).startsWith("HUB-SGN-");
            String[] parts = code.split("-");
            assertThat(parts).hasSize(3);
            assertThat(parts[0]).isEqualTo("HUB");
            assertThat(parts[1]).isEqualTo("SGN");
            assertThat(parts[2]).hasSize(4);
        }

        @Test
        @DisplayName("generate with helper method takes prefix and length")
        void generate_helperOverload_createsCode() {
            String code = BusinessCodeGenerator.generate("DRP", 6);

            assertThat(code).startsWith("DRP-");
            assertThat(code.substring(4)).hasSize(6);
        }

        @Test
        @DisplayName("generate with helper method takes prefix, datePattern and length")
        void generate_helperOverloadWithDate_createsCode() {
            String code = BusinessCodeGenerator.generate("TEST", "yyyy", 5);

            String year = String.valueOf(LocalDate.now().getYear());
            assertThat(code).startsWith("TEST-" + year + "-");
            assertThat(code.substring(code.lastIndexOf('-') + 1)).hasSize(5);
        }

        @Test
        @DisplayName("generate with null rule throws NullPointerException")
        void generate_nullRule_throwsException() {
            assertThatThrownBy(() -> BusinessCodeGenerator.generate((CodePatternRule) null))
                    .isInstanceOf(NullPointerException.class)
                    .hasMessageContaining("CodePatternRule must not be null");
        }
    }

    @Nested
    @DisplayName("Entropy & Uniqueness Tests")
    class EntropyAndUniquenessTests {

        @Test
        @DisplayName("generateRandomEntropy produces strings containing only safe Base32 chars")
        void generateRandomEntropy_usesOnlySafeAlphabet() {
            for (int i = 0; i < 50; i++) {
                String entropy = BusinessCodeGenerator.generateRandomEntropy(8);
                assertThat(entropy).hasSize(8);
                for (char c : entropy.toCharArray()) {
                    assertThat(SAFE_ALPHABET).contains(String.valueOf(c));
                    assertThat(c).isNotEqualTo('0');
                    assertThat(c).isNotEqualTo('O');
                    assertThat(c).isNotEqualTo('1');
                    assertThat(c).isNotEqualTo('I');
                }
            }
        }

        @Test
        @DisplayName("generateRandomEntropy with negative or zero length falls back to 4")
        void generateRandomEntropy_negativeOrZeroLength_fallsBackToFour() {
            assertThat(BusinessCodeGenerator.generateRandomEntropy(0)).hasSize(4);
            assertThat(BusinessCodeGenerator.generateRandomEntropy(-5)).hasSize(4);
        }

        @Test
        @DisplayName("generate generates distinct codes across 100 iterations")
        void generate_highEntropy_generatesDistinctValues() {
            Set<String> generatedCodes = new HashSet<>();
            for (int i = 0; i < 100; i++) {
                String code = BusinessCodeGenerator.generate(CodePatternRule.FLIGHT_NUMBER);
                generatedCodes.add(code);
            }
            assertThat(generatedCodes).hasSize(100);
        }

        @Test
        @DisplayName("generateUnique retries when candidate exists and succeeds on available code")
        void generateUnique_withCollision_retriesUntilAvailable() {
            AtomicInteger calls = new AtomicInteger(0);
            String uniqueCode = BusinessCodeGenerator.generateUnique(
                    CodePatternRule.HUB_CODE,
                    candidate -> calls.incrementAndGet() < 3,
                    5
            );

            assertThat(uniqueCode).isNotNull().startsWith("HUB-");
            assertThat(calls.get()).isEqualTo(3);
        }

        @Test
        @DisplayName("generateUnique throws IllegalStateException when retries exceeded")
        void generateUnique_alwaysColliding_throwsException() {
            assertThatThrownBy(() -> BusinessCodeGenerator.generateUnique(
                    CodePatternRule.HUB_CODE,
                    candidate -> true,
                    3
            ))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Failed to generate unique code for prefix: HUB after 3 attempts");
        }
    }
}
