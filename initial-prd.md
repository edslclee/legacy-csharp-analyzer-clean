# PRD: 코드·매뉴얼 기반 AS-IS 분석 자동화 MVP (Initial)

> 본 문서는 프로젝트의 **최초 기획 의도**를 정리한 초기 PRD입니다. 이후 진행 과정에서 확장/수정된 내용은 `revised-prd.md`에 반영합니다.

---

## 1. 목적 (Why)
- 레거시 C# / SQL / 매뉴얼 문서를 **한 번에 업로드**하여, 시스템의 **AS-IS 구조**를 자동 분석한다.
- 테이블/컬럼, 관계(ERD), 프로세스 목록, CRUD 매트릭스를 **LLM으로 요약**·정리한다.
- 결과를 UI로 확인하고 **PDF/DOCX/PNG/CSV** 등으로 내보낸다.

## 2. 범위 (Scope)
- **입력**: C#, SQL, 텍스트 매뉴얼(doc 텍스트화) 파일들의 본문
- **출력**:
  - `tables`: 테이블명/컬럼/제약조건
  - `erd_mermaid`: Mermaid ER 다이어그램 문법 문자열
  - `crud_matrix`: 테이블별 CRUD 수행 여부
  - `processes`: 기능/업무 프로세스 요약
  - `doc_links`: 원문(매뉴얼/문서) 참조 링크·스니펫
- **UI**:
  - 파일 업로드, 분석 실행, 결과 탭(ERD, CRUD, 프로세스, 문서)
  - **다운로드**: ERD PNG, PDF 보고서, DOCX 보고서, CRUD CSV
- **API**:
  - `POST /analyze` (JSON 본문) → 위 결과 JSON 반환
  - `GET /health`

## 3. 사용자 (Personas)
- **개발자/아키텍트**: 레거시 시스템 구조를 빠르게 파악
- **PM/분석가**: 현행 프로세스 및 의존성 요약 자료 필요
- **신규 투입 인력**: 온보딩용 요약 자료

## 4. 성공 기준 (Success Metrics)
- 1MB~5MB 입력 기준 **분석 성공률 ≥ 95%** (스키마/ERD 파싱 성공)
- UI에서 ERD/CRUD/프로세스 **즉시 렌더링** 및 **오류 없는 내보내기**
- 결과물(PDF/DOCX/PNG/CSV) **다운로드 성공률 ≥ 99%**

## 5. 제약/가정 (Constraints)
- 초기 모델: OpenAI (예: `gpt-4o-mini`) 사용
- **업로드 총량 제한**: 5MB, **문자 수 제한**: 20만자(초기값)
- LLM 응답은 **JSON 형태**만 허용 (markdown fence 금지), 필요 시 **jsonrepair** 보정
- ERD는 Mermaid `erDiagram` 문법으로 생성
- 초기 단계에서 외부 DB 접속/실제 빌드 파이프라인 연동은 제외

## 6. 시스템 구성 (High-level)
- **Web (Vite + React + TS)**: 파일 업로드, 결과 렌더, 내보내기
- **API (Node + Express + TS)**: LLM 호출, 스키마 검증(Zod), 결과 정규화
- **로깅/모니터링**: pino, pino-http, Prometheus `/metrics`
- **Retry/Timeout**: OpenAI 호출에 지수 백오프로 재시도, 시도별 타임아웃
- **CI**: GitHub Actions — web 빌드, api 타입체크·테스트
- **Docker**: `docker-compose`로 api+web 올인원 실행

## 7. 상세 인터페이스
### 7.1 API
- **`POST /analyze`**
  - Request
    ```json
    {
      "files": [
        { "name": "User.cs", "type": "cs", "content": "// ..." },
        { "name": "schema.sql", "type": "sql", "content": "-- ..." },
        { "name": "manual.txt", "type": "doc", "content": "..." }
      ],
      "maxChars": 200000
    }
    ```
  - Response
    ```json
    {
      "tables": [
        {
          "name": "Users",
          "columns": [
            { "name": "Id", "type": "INT", "pk": true, "nullable": false },
            { "name": "Name", "type": "VARCHAR(100)", "nullable": false }
          ]
        }
      ],
      "erd_mermaid": "erDiagram\nUsers { INT Id PK ... }",
      "crud_matrix": [
        { "process": "User", "table": "Users", "ops": ["C","R","U","D"] }
      ],
      "processes": [{ "name": "Create User" }],
      "doc_links": [{ "doc": "manual.txt", "snippet": "..." , "related": "Users" }]
    }
    ```

### 7.2 Web
- 탭 구성: **ERD / CRUD / Processes / Docs**
- 다운로드 그룹: **ERD PNG / PDF / DOCX / CRUD CSV**
- 에러 바운더리 및 로딩 상태 표시

## 8. 품질 요소
- **로깅**: 요청-응답, 에러, OpenAI 재시도 로그
- **스키마 검증**: Zod로 입력/출력 엄격 검증 (파일 최소 1개 필수)
- **테스트**: vitest + supertest (헬스체크, 유효성, 5MB 제한, retry 유틸)
- **성능**: 본문 압축/요약(`maxChars`) 및 불필요 로그/이미지 생략

## 9. 마일스톤
- **M1 (Stability)**: Logging, Retry, Tests, Docker, Mock 스위치, LLM Raw 로그
- **M2 (UX/Export)**: 내보내기(PDF/DOCX/PNG/CSV) 완성, 에러/빈응답 보강
- **M3 (확장)**: 파일 포맷 확대, Role/Permission, 프로젝트 보관

## 10. 비범위 (Out of Scope)
- 실제 DB 연결/리버스 엔지니어링
- 다중 프로젝트 동시 비교/머지
- LLM 파인튜닝

---

## 부록 A. 오류 처리 원칙
- LLM JSON 파싱 실패 → `jsonrepair` 보정 후 실패 시 `502 BAD_UPSTREAM`
- 스키마 미일치 → `422 BAD_JSON` + 힌트
- 5MB 초과 → `413 FILE_TOO_LARGE`
- 서버 오류 → `500 INTERNAL`

## 부록 B. 환경변수
- `OPENAI_API_KEY`, `OPENAI_MODEL`(기본 gpt-4o-mini)
- `CORS_ORIGINS`(기본 http://localhost:5173)
- `PORT`(기본 8787)
- `LOG_LEVEL`(info)
- 재시도/타임아웃: `OPENAI_MAX_RETRIES`(기본 3), `OPENAI_TIMEOUT_MS`(기본 30000)

