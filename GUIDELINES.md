# As-Is Navigator (Prototype) - 개발 가이드라인

이 문서는 프로젝트의 UI 레이아웃, 실행 시나리오, 코드 규칙(가드레일)을 정의합니다.  
개발 과정에서 반드시 이 규칙을 준수해야 합니다.

---

## 1. UI 레이아웃 (고정 규약)

### 상단 고정 헤더
- **가운데:** `As-Is Navigator (Prototype)`
- **오른쪽:** `API: mock mode | online`

### Block 1: File Upload
- 좌측: 코드/SQL 파일 업로드 (`.cs`, `.sql`, `.zip`)
- 우측: 문서 업로드 (`.txt`, `.pdf`, `.docx`)
- 업로드한 파일 수 표시

### Block 2: 분석 실행
- 중앙 버튼: **“분석 실행”**
- 하단 문구: `※ mock 모드에서는 파일 없이도 실행됩니다.`

### Block 3: Results
- 탭: **ERD | TABLES | PROCESS | CRUD (+DOCS 필요시)**
- 분석 전: 숨김 / 분석 후: 표시
- 각 탭 하단: 내보내기 버튼
  - **Diagram PNG, JSON, CSV(zip), PDF, DOCX**
- 본문: 해당 탭의 분석 결과 (가능하면 다이어그램/표/리스트)

### Block 4: 최종 분석 보고서
- 제목: **“종합 문서 다운로드”**
- 내보내기 버튼:
  - Diagram, JSON, CSV(zip), PDF, DOCX, ZIP 번들

⚠️ **이 4개의 블록은 위치와 순서를 절대 변경하지 않는다.**

---

## 2. 실행 시나리오
1. 파일 업로드
2. **분석 실행**
   - ERD, Tables, Process, CRUD 탭이 생성됨
   - 각 탭의 결과가 표시됨
   - 각 탭 결과를 JSON/CSV/PDF/DOCX/Diagram 형식으로 다운로드 가능
3. 최종 분석 보고서 종합 다운로드
   - JSON, CSV(zip), PDF, DOCX, Diagram, ZIP 번들

---

## 3. 코드 규칙 (가드레일)

### `exporters.ts`
- 표준 함수명
  - `exportPdf`
  - `exportDocx`
  - `downloadJSON`
  - `exportCsvZip`
  - `exportAllZip`
- 호환 별칭
  - `downloadJson` → `downloadJSON`
  - `exportCSVZip` → `exportCsvZip`
  - `exportZipBundle` → `exportAllZip`
- 추가
  - `exportDiagramPngFromSvg(svgEl, filename)`

### `api.ts`
- 유지 함수
  - `isUsingMock()`
  - `setMockMode()`
  - `apiHealth()`
  - `analyzeOrMock(files)`

### `mock.ts`
- 풍부한 mock 데이터 포함
  - ERD mermaid sample
  - table definitions
  - processes
  - CRUD 매핑
  - docs

---

## 4. 최근 이슈 & 해결
- ❌ `exportZipBundle` not found → ✅ `exportAllZip`으로 표준화
- ❌ `downloadJSON` / `downloadJson` 불일치 → ✅ 별칭 처리
- ❌ ERD 빈화면 → ✅ `ErdViewer.tsx` 추가
- ❌ React child error (object 출력) → ✅ 배열/문자열 변환
- ✅ mock 모드 동작 확인
- 🔜 API 모드 연동 예정

---

## 5. 유의사항
- 항상 `GUIDELINES.md`를 참조하며 개발할 것
- 새로운 기능 추가 시에도 Block 구조와 함수 네이밍 규칙을 유지
- CI/CD 파이프라인에서 이 규칙을 체크하는 자동화 추가 예정