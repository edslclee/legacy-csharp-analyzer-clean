// apps/web/src/lib/mock.ts
import type { AnalysisResult, InputFile } from '../types'

/** 샘플 Mermaid (검증 통과 버전) */
const SAMPLE_ERD = `
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
    datetime LastUpdated
  }

  OrderItems {
    int Id PK
    int OrderId FK
    int ProductId FK
    int Quantity
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
  Products ||--o{ OrderItems : referenced
  Orders ||--o{ Payments : paidBy
`.trim()

/** 풍부화된 목업 데이터 */
const MOCK_RESULT: AnalysisResult = {
  erd_mermaid: SAMPLE_ERD,
  tables: [
    {
      name: 'Users',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'Name', type: 'nvarchar(100)', nullable: true },
        { name: 'Email', type: 'nvarchar(200)', nullable: true },
        { name: 'CreatedAt', type: 'datetime', nullable: true },
      ],
    },
    {
      name: 'Orders',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'UserId', type: 'int', nullable: true },
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
        { name: 'LastUpdated', type: 'datetime', nullable: true },
      ],
    },
    {
      name: 'OrderItems',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'OrderId', type: 'int', nullable: true },
        { name: 'ProductId', type: 'int', nullable: true },
        { name: 'Quantity', type: 'int', nullable: true },
      ],
    },
    {
      name: 'Payments',
      columns: [
        { name: 'Id', type: 'int', pk: true, nullable: false },
        { name: 'OrderId', type: 'int', nullable: true },
        { name: 'Amount', type: 'decimal(10,2)', nullable: true },
        { name: 'PaymentDate', type: 'datetime', nullable: true },
        { name: 'Method', type: 'nvarchar(50)', nullable: true },
      ],
    },
  ],
  processes: [
    { name: 'User Registration', description: '신규 사용자 가입' },
    { name: 'Create Order', description: '주문 생성' },
    { name: 'Add OrderItem', description: '주문 품목 추가' },
    { name: 'Pay Order', description: '결제 처리' },
    { name: 'Inventory Sync', description: '재고 동기화' },
  ],
  crudMatrix: [
    { process: 'User Registration', table: 'Users', operation: 'C' },
    { process: 'Create Order', table: 'Orders', operation: 'C' },
    { process: 'Add OrderItem', table: 'OrderItems', operation: 'C' },
    { process: 'Pay Order', table: 'Payments', operation: 'C' },
    { process: 'Inventory Sync', table: 'Products', operation: 'U' },
  ],
  docs: [
    'https://example.com/specs/user-flow',
    'https://example.com/specs/order-flow',
  ],
}

/** 파일과 무관하게 mock 을 돌려줌(파일 개수는 UI 보조표시용) */
export async function mockAnalyze(_files: InputFile[]): Promise<AnalysisResult> {
  // 네트워크 대기 시뮬레이션
  await new Promise(res => setTimeout(res, 300))
  return structuredClone(MOCK_RESULT)
}