# 📘 스마트 원격 가계부 (Smart Ledger) - 어디서나 사용 설명서

> **한 줄 요약:**  
> Supabase 클라우드 기반 24시간 실시간 연동 가계부입니다.  
> 집 PC 서버를 켤 필요 없이, **스마트폰 무인 자동 등록**, **PWA 모바일 앱**, **PC 포터블 프로그램** 어디서나 실시간으로 동기화됩니다.

---

## 🔗 원클릭 바로가기 & 다운로드

| 구분 | 링크 | 설명 |
| :--- | :--- | :--- |
| **📱 스마트폰 PWA 앱 접속** | [https://aud9855.github.io/smart-ledger/](https://aud9855.github.io/smart-ledger/) | **보안 경고 0건**, 브라우저 접속 후 [홈 화면에 추가] 누르면 즉시 앱 설치 |
| **🖥️ PC용 실행 프로그램** | [SmartLedger.exe 다운로드](https://github.com/aud9855/smart-ledger/releases/download/v1.0.1/SmartLedger.exe) | 설치 불필요, 더블클릭 즉시 실행 (윈도우 포터블) |
| **🤖 무인 자동화 가이드** | [MacroDroid 설정 가이드](./MACRODROID_GUIDE.md) | 결제 알림 올 때 폰 안 켜도 자동 등록 (중복 제거 포함) |
| **📦 GitHub 통합 릴리즈** | [GitHub Releases v1.0.1](https://github.com/aud9855/smart-ledger/releases/tag/v1.0.1) | 최신 빌드 파일 배포 페이지 |
| **💻 GitHub 소스코드** | [aud9855/smart-ledger](https://github.com/aud9855/smart-ledger) | 전체 소스코드 저장소 |
| **☁️ Supabase 클라우드** | [Supabase 콘솔 바로가기](https://supabase.com/dashboard/project/uyafrivmhhyzicbnkhet) | 24시간 가계부 데이터베이스 |

---

## 🤖 1. 무인 자동 등록: 결제 알림 오면 폰 안 켜도 등록 (⭐️ 최고 편함)

1. **Supabase 중복 방지 & 자동 분류 SQL 실행 (최초 1회):**
   * [Supabase SQL Editor](https://supabase.com/dashboard/project/uyafrivmhhyzicbnkhet/sql/new)에서 저장소의 `schema_automation.sql`을 실행합니다.
   * 토스 알림과 카드사 문자가 동시에 와도 **3분 내 동일 결제는 자동으로 중복 제거**되고, 상호명(스타벅스, 배민 등)에 따라 카테고리가 자동 분류됩니다.
2. **스마트폰 MacroDroid 설정:**
   * 스마트폰에 **MacroDroid**(무료) 설치 후 알림 감지 → Supabase 전송 설정.
   * 상세 세팅법: [MACRODROID_GUIDE.md](./MACRODROID_GUIDE.md) 참조.

---

## 📱 2. 스마트폰 앱으로 수동 등록 (현금, 계좌이체 등)

### 방법 ① PWA 웹앱 (추천 ⭐ / 보안 경고 0건)
1. 스마트폰 브라우저로 [https://aud9855.github.io/smart-ledger/](https://aud9855.github.io/smart-ledger/) 접속
2. 상단 **[앱 설치]** 버튼 (또는 브라우저 메뉴에서 [홈 화면에 추가]) 터치
3. 바탕화면에 설치된 **스마트가계부** 아이콘을 눌러 전체화면 네이티브 앱처럼 3초 만에 간편 기록

### 방법 ② 안드로이드 APK 파일 설치
* [SmartLedger.apk 다운로드 (v1.0.2)](https://github.com/aud9855/smart-ledger/releases/download/v1.0.2/SmartLedger.apk) 클릭 후 설치 (신규 지갑 아이콘 각인 완료)

---

## 🖥️ 3. 다른 PC에서 사용하는 방법 (회사, 노트북 등)

1. [SmartLedger.exe 다운로드](https://github.com/aud9855/smart-ledger/releases/download/v1.0.2/SmartLedger.exe) 링크 클릭
2. 다운로드된 **`SmartLedger.exe`**를 바탕화면에 두고 **더블클릭** 실행

---

## 🔑 4. 클라우드 DB 접속 정보 (보관용)

* **Supabase URL:** `https://uyafrivmhhyzicbnkhet.supabase.co`
* **Publishable Anon Key:** 저장소에 적지 않음 — Supabase → Project Settings → API Keys에서 확인 (로컬은 `.env`, 배포는 GitHub Secrets `VITE_SUPABASE_ANON_KEY`)
* **7일 미사용 방지 자동화:** 매 3일마다 GitHub Actions(`.github/workflows/keep_alive.yml`)가 자동으로 핑을 보내 무료 티어 DB가 잠들지 않도록 영구 유지합니다.

---

## 🛠️ 5. 개발 언어 및 기술 스택 (Tech Stack & Versions)

* **🎨 Frontend:** React `v19.0.0`, TypeScript `v5.7.3`, Vite `v6.1.0`, Tailwind CSS `v3.4.17`, Recharts `v2.15.1`, Lucide React `v0.475.0`, Pretendard `v1.3.9`
* **☁️ Backend & DB:** Supabase Cloud (`@supabase/supabase-js v2.49.1`), PostgreSQL `v15+`, PL/pgSQL 중복 방지 & 자동 분류 트리거
* **📦 Cross-Platform:** PWA (Service Worker `v2`), Electron `v44.7.0` (`SmartLedger.exe`), Capacitor `v8.5.3` (`SmartLedger.apk`), GitHub Pages (24/7 HTTPS)
* **🤖 Automation:** MacroDroid (토스 결제 알림 무인 파싱 및 REST API 직송), GitHub Actions (매 3일 DB 잠듦 방지 Ping)
