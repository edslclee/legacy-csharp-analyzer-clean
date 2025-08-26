# Product Requirements Document (PRD)  
**Project:** Legacy C# Analyzer (As-Is Navigator)  
**Version:** 2.0 (Revised)  
**Date:** 2025-08-26  

---

## 1. Overview  
As-Is Navigator는 C# 레거시 소스코드, SQL 스키마, 매뉴얼 문서(문서/PPT/이미지/동영상 등)를 입력 받아 자동으로 **AS-IS 분석 산출물**(ERD, CRUD Matrix, Process Map, Documentation)을 생성하는 웹 기반 분석 도구이다.  
최초의 PRD 대비, 현재까지 개발된 부분을 반영하여 본 문서를 업데이트한다.  

---

## 2. Problem Statement  
- 레거시 C# 시스템 분석에 많은 인력과 시간이 소요됨.  
- SQL Schema와 문서까지 포함한 전체 구조를 빠르게 이해하기 어려움.  
- 산출물(ERD/CRUD/Process Flow 등)을 수작업으로 정리해야 하며, 오류 발생 위험이 큼.  

---

## 3. Goals & Success Metrics  

### Goals  
- 업로드된 `.cs`, `.sql`, `.doc`(매뉴얼 추출) 파일을 분석하여 **AI 기반 AS-IS 분석 리포트**를 자동 생성.  
- ERD 다이어그램, CRUD 매트릭스, 프로세스 계층, 문서 연결(링크)을 자동 정리.  
- 웹 UI에서 분석 결과를 확인하고 PDF/Word/Docx/PNG로 다운로드.  
- Docker 기반으로 실행 가능하며, GitHub Actions CI/CD 연계.  

### Success Metrics  
- ⏱ Time-to-Insight: 업로드 후 60분 이내 분석 완료  
- 📄 자동 생성 산출물 품질: LLM 결과를 JSON Schema로 검증 및 정규화  
- 🛠 DevOps Ready: `docker-compose up` 으로 web/api 서비스 동작  
- ✅ CI/CD: GitHub Actions에서 Web+API build/test 성공  

---

## 4. Scope  

### In Scope (현재까지 구현됨 ✅)  
- [x] **API 서버 (`apps/api`)**  
  - Express + TypeScript 기반 REST API  
  - `/analyze` 엔드포인트 (파일 업로드 후 AI 분석 수행)  
  - OpenAI API (GPT-4o-mini) 연동 및 JSON Schema Validation (`zod`)  
  - JSON output normalization (tables, crud_matrix, processes, doc_links, erd_mermaid)  
  - Logging (pino), Metrics (Prometheus)  
  - Dockerfile 작성 완료  

- [x] **Web 클라이언트 (`apps/web`)**  
  - React + Vite + Tailwind  
  - 파일 업로드 → API 호출 → 분석 결과 렌더링  
  - ERD 다이어그램 (Mermaid.js) 렌더링  
  - Download 버튼 (PDF, DOCX, PNG 내보내기 기능)  
  - ErrorBoundary 및 안정성 보강  
  - Dockerfile + Nginx 배포  

- [x] **CI/CD**  
  - GitHub Actions Workflow (`.github/workflows/ci.yml`) 작성  
  - Node.js 20.x 환경에서 build/test 실행  
  - web/api 각각 빌드 및 타입체크, 테스트 실행  

### Out of Scope (차기 단계 🚧)  
- 다국어 UI 지원  
- To-Be 설계 자동화  
- 멀티 사용자 인증/권한 관리  
- 클라우드 SaaS 서비스화  

---

## 5. User Stories  

- **PM/아키텍트**: “C# + SQL 프로젝트의 전체 구조를 빠르게 파악하고 싶다.”  
- **개발자**: “레거시 시스템을 모던 아키텍처로 이전하기 전 CRUD/ERD를 보고 싶다.”  
- **SI 회사**: “제안서/보고서 작성 시 자동 생성된 리포트를 활용하고 싶다.”  

---

## 6. Deliverables  

- API (TypeScript/Express) + Web (React/Tailwind)  
- Docker Compose (`docker-compose.yml`) → 로컬에서 손쉽게 기동 가능  
- GitHub Actions CI/CD (Web+API Build & Test)  
- 산출물 다운로드 (PDF, DOCX, PNG) 기능  
- Revised PRD (본 문서)  

---

## 7. Architecture (현재 상태 기준)  

```
┌─────────────┐        ┌─────────────┐
│   Web App   │ <────> │   API App   │
│ (React/Vite)│        │ (Express)   │
└─────────────┘        └─────────────┘
        │                       │
        │  /analyze             │
        │  JSON Req/Res         │
        ▼                       ▼
   File Upload             OpenAI GPT
 (UI → API 전달)       JSON Schema Normalize
        │                       │
        └──────────► ERD / CRUD / Docs
```

---

## 8. Next Steps  

1. **CI/CD 안정화**  
   - `package-lock.json` 불일치 문제 해결  
   - Node 22.x → CI 환경 Node 20.x 일치 검토  

2. **UX 개선**  
   - Download 버튼 UI 개선 (정렬/아이콘 보완)  
   - 분석 진행 중 로딩 Indicator 추가  

3. **기능 확장**  
   - ERD Export → PNG + SVG  
   - Process Flow 다이어그램 추가  

4. **문서 업데이트**  
   - README.md: 설치/빌드 방법  
   - context.md + revised-prd.md: 추적 관리  
