/**
 * apps/web/src/lib/mock.ts
 * - 개발/테스트용 목업 데이터 & 함수
 * - 실제 분석 모양과 최대한 유사하게 구성
 */

import type { AnalysisResult, InputFile } from './api';

export const MOCK_RESULT: AnalysisResult = {
  tables: [
    {
      name: 'Users',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'Name', type: 'nvarchar(100)', nullable: false },
        { name: 'Email', type: 'nvarchar(200)', nullable: true },
        { name: 'CreatedAt', type: 'datetime', nullable: true },
      ],
    },
    {
      name: 'Orders',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'UserId', type: 'int', fk: { table: 'Users', column: 'Id' }, nullable: true },
        { name: 'OrderDate', type: 'datetime', nullable: true },
        { name: 'TotalAmount', type: 'decimal(10,2)', nullable: true },
      ],
    },
    {
      name: 'Products',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'Name', type: 'nvarchar(200)', nullable: true },
        { name: 'Price', type: 'decimal(10,2)', nullable: true },
        { name: 'Stock', type: 'int', nullable: true },
      ],
    },
    {
      name: 'OrderItems',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'OrderId', type: 'int', fk: { table: 'Orders', column: 'Id' }, nullable: true },
        { name: 'ProductId', type: 'int', fk: { table: 'Products', column: 'Id' }, nullable: true },
        { name: 'Quantity', type: 'int', nullable: true },
        { name: 'LastUpdated', type: 'datetime', nullable: true },
      ],
    },
    {
      name: 'Payments',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'OrderId', type: 'int', fk: { table: 'Orders', column: 'Id' }, nullable: true },
        { name: 'Amount', type: 'decimal(10,2)', nullable: true },
        { name: 'PaymentDate', type: 'datetime', nullable: true },
        { name: 'Method', type: 'nvarchar(50)', nullable: true },
      ],
    },
  ],

  // Mermaid erDiagram (문법 엄격)
  erd_mermaid: `
erDiagram
  Users {
    int Id PK
    nvarchar Name
    nvarchar Email
    datetime CreatedAt
  }

  Orders {
    int Id PK
    int UserId FK
    datetime OrderDate
    decimal TotalAmount
  }

  Products {
    int Id PK
    nvarchar Name
    decimal Price
    int Stock
  }

  OrderItems {
    int Id PK
    int OrderId FK
    int ProductId FK
    int Quantity
    datetime LastUpdated
  }

  Payments {
    int Id PK
    int OrderId FK
    decimal Amount
    datetime PaymentDate
    nvarchar Method
  }

  Users ||--o{ Orders : places
  Orders ||--o{ OrderItems : contains
  Products ||--o{ OrderItems : listed
  Orders ||--o{ Payments : paid_by
`.trim(),

  crud_matrix: [
    { process: 'User Registration', table: 'Users', ops: ['C', 'R', 'U'] },
    { process: 'Place Order', table: 'Orders', ops: ['C', 'R', 'U'] },
    { process: 'Place Order', table: 'OrderItems', ops: ['C', 'R', 'U'] },
    { process: 'Payment', table: 'Payments', ops: ['C', 'R'] },
    { process: 'Inventory', table: 'Products', ops: ['R', 'U'] },
  ],

  processes: [
    { name: 'User Registration', description: '사용자 등록 및 계정 생성' },
    { name: 'Place Order', description: '주문 생성과 항목 추가' },
    { name: 'Payment', description: '주문 결제 처리' },
    { name: 'Inventory', description: '상품 재고 관리' },
  ],

  doc_links: [
    { doc: 'manual.txt', snippet: '사용자 등록/주문 흐름 설명', related: 'Users, Orders' },
    { doc: 'operations.txt', snippet: '재고 처리/결제 처리', related: 'Inventory, Payments' },
  ],
};

/** mock health */
export async function mockHealth(): Promise<{ ok: true; model: string }> {
  return { ok: true, model: 'mock' };
}

/** mock analyze: 입력 파일은 무시하고 MOCK_RESULT 반환 */
export async function mockAnalyze(_files: InputFile[]): Promise<AnalysisResult> {
  // 실제라면 _files를 바탕으로 간단한 규칙 기반 분석을 해도 됨.
  // 지금은 개발 편의상 고정 데이터를 반환.
  return structuredClone(MOCK_RESULT);
}