import type { AppMessages } from "./index";

declare module "next-intl" {
    interface AppConfig {
        Messages: AppMessages;
    }
}
