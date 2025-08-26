# Context: Legacy C# Analyzer (As-Is Navigator) 프로젝트 진행 상태

## ✅ 현재 구현된 기능
- **Monorepo 구조**: 
  - apps/api → Express 기반 REST API
  - apps/web → React + Vite + Tailwind 웹 클라이언트
- **API**
  - `/health`, `/metrics`, `/analyze` 구현
  - OpenAI 모델 연동 (chat.completions, response_format=json_object)
  - Retry 유틸(`lib/retry.ts`)
  - Zod 기반 검증 + JSON 파싱(jsonrepair) + normalize 처리
- **Web**
  - 파일 업로드 → API `/analyze` 호출 → 결과 표시
  - Mermaid.js 기반 ERD 렌더링
  - CRUD, Process, Doc Links 표시
  - Download 기능 (PDF, CSV, DOCX)
  - Tailwind 설정 + ErrorBoundary 안정화
- **DevOps**
  - Dockerfile + docker-compose로 api/web 컨테이너 실행
  - GitHub Actions CI 구축
  - Node 22.17.1 / npm 10.9.2 버전 기반 동작
  - Protected branch → PR + Actions 통과 후 merge

---

## 📌 향후 작업
1. **Web UX 개선**
   - 파일 업로드 진행 상태(progress bar)
   - UI 개선 (collapsible section, 테이블 뷰)
   - ERD 파싱 실패 시 fallback 처리
2. **API 고도화**
   - Confidence Score 추가
   - 파일 경로/라인 근거 정보 포함 (prompt 보강)
   - 대용량 파일 처리 (chunking, streaming)
3. **DevOps**
   - CI에서 Vitest/Playwright 테스트 추가
   - Docker 이미지 빌드 & GitHub Container Registry 배포
4. **문서화**
   - README.md 업데이트 (실행 방법, 아키텍처 다이어그램)
   - PRD와 구현사항 매핑 (Traceability Table 작성)

---

## 🔖 참고
- 최초 PRD: *자동 AS-IS 분석 도구 (Legacy C# Analyzer)*
- Revised PRD: *Product Requirements Document v1.6 (2025-08-27)*  
- 현재까지 구현된 기능은 Revised PRD의 **MVP 범위** 대부분을 충족.
- 추가 고도화 및 UX 개선은 차기 스프린트로 진행 예정.
