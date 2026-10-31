# Customer Home — Figma31:2

Home component: src/features/home/CustomerHomeScreen.tsx; StyleSheet: home.styles.ts. Exact official images/icons local in src/shared/assets/home, reference file OCkWSOZQ8Pq8AejXccajpO node31:2. Source screenshot inspected from fresh design context31/10/2026. No screenshot-as-UI.

## Demo login

Email a@gmail.com; password12345678; account CUSTOMER-MINH-ANH, fullName Minh Anh, role customer. Fixture stored in SEEDED_MOCK_ACCOUNTS at src/repositories/mock/createMockRepository.ts, queried by existing repository.login. No database/SQL/server required. This is a demo-only fixture, not a real authentication service. Wrong identifier/password returns repository error and stays Login. Session uses existing secure session storage; added seed is present on fresh repository initialization without deleting current app data.

Login success now calls onLoginSuccess and resets native navigator to CustomerHome for customer/DriverTrips for driver. Review Login scenario also opens real Home on customer success. Home review link bluemobile://debug/case/FIGMA-31-2. Root normal flow Welcome→Login→Home.

## UI and scope

Greeting/weather/header official BLUE logo+notification/profile, quick origin/destination/date, swap action, upcoming BLUEExpress banner with official bus image, filters, destination carousel and five navigation tabs. Data is frontend mock matching Figma. Weather static28°C, dates/fares illustrative. Swap works; filter selected state works. Destinations/search/date/notifications/account/tabs not yet implemented open explicit pending notice, not fake successful navigation. No location permission for Gần bạn.

App fills window; portrait and landscape use safe-area/ScrollView, content max600dp; narrow widths/large fonts reflow quick fields; destination carousel scrolls horizontally. Typography uses existing Be Vietnam Pro tokens; geometry adapted native flex. Logo110x40, triplogo72x24, busbanner min146high, destination142x112, card142xmin198, navmin80; official icon sizes14/16/18/20 as original. Fullmatrix not claimed.

Verification: typecheck/lint and8 auth-related tests pass including correct demo credentials +wrong email/password. Native screenshots artifacts/FIGMA-31-2; native login evidence if complete stored login-evidence.json. User visual review pending.
