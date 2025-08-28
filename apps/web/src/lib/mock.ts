// apps/web/src/lib/mock.ts
import type { AnalysisResult } from './api';

export const mockResult: AnalysisResult = {
  erd_mermaid: `
    erDiagram
      USERS {
        int Id PK
        nvarchar Name
        nvarchar Email
        datetime CreatedAt
      }
      ORDERS {
        int Id PK
        int UserId FK
        datetime OrderDate
        decimal TotalAmount
      }
      PRODUCTS {
        int Id PK
        nvarchar Name
        decimal Price
        int Stock
      }
      ORDERITEMS {
        int Id PK
        int OrderId FK
        int ProductId FK
        int Quantity
        datetime LastUpdated
      }
      PAYMENTS {
        int Id PK
        int OrderId FK
        decimal Amount
        datetime PaymentDate
        nvarchar Method
      }

      USERS ||--o{ ORDERS : places
      ORDERS ||--|{ ORDERITEMS : contains
      PRODUCTS ||--o{ ORDERITEMS : "ordered in"
      ORDERS ||--o{ PAYMENTS : "paid by"
  `,
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
        { name: 'UserId', type: 'int', fk: { table: 'Users', column: 'Id' } },
        { name: 'OrderDate', type: 'datetime', nullable: true },
        { name: 'TotalAmount', type: 'decimal(10,2)', nullable: true },
      ],
    },
    {
      name: 'Products',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'Name', type: 'nvarchar(200)', nullable: false },
        { name: 'Price', type: 'decimal(10,2)', nullable: true },
        { name: 'Stock', type: 'int', nullable: true },
      ],
    },
    {
      name: 'OrderItems',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'OrderId', type: 'int', fk: { table: 'Orders', column: 'Id' } },
        { name: 'ProductId', type: 'int', fk: { table: 'Products', column: 'Id' } },
        { name: 'Quantity', type: 'int', nullable: true },
        { name: 'LastUpdated', type: 'datetime', nullable: true },
      ],
    },
    {
      name: 'Payments',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'OrderId', type: 'int', fk: { table: 'Orders', column: 'Id' } },
        { name: 'Amount', type: 'decimal(10,2)', nullable: true },
        { name: 'PaymentDate', type: 'datetime', nullable: true },
        { name: 'Method', type: 'nvarchar(50)', nullable: true },
      ],
    },
  ],
  crud_matrix: [
    { process: 'User Registration', table: 'Users', ops: ['C'] },
    { process: 'Place Order', table: 'Orders', ops: ['C', 'R'] },
    { process: 'Manage Products', table: 'Products', ops: ['C', 'R', 'U', 'D'] },
    { process: 'Order Items', table: 'OrderItems', ops: ['C', 'R', 'U'] },
    { process: 'Payment Handling', table: 'Payments', ops: ['C', 'R'] },
  ],
  processes: [
    { name: 'User Registration', description: '신규 사용자를 등록하고 계정을 생성' },
    { name: 'Order Placement', description: '사용자가 상품을 선택하고 주문을 제출' },
    { name: 'Inventory Management', description: '상품 재고를 관리하고 갱신' },
    { name: 'Payment Processing', description: '주문 결제를 처리하고 상태를 기록' },
  ],
  doc_links: [
    { doc: 'manual.txt', snippet: '사용자 등록 및 주문 흐름 설명', related: 'Users, Orders' },
    { doc: 'operations.txt', snippet: '재고 처리와 결제 처리', related: 'Inventory, Payments' },
  ],
};

/** mock 분석 함수: 실제 analyze와 동일한 시그니처를 흉내냅니다. */
export async function mockAnalyze(
  _files: { name: string; type: 'cs' | 'sql' | 'doc'; content: string }[]
): Promise<AnalysisResult> {
  // 네트워크 대기 시뮬레이션(선택)
  await new Promise((r) => setTimeout(r, 200));
  return mockResult;
}