// app/bom/page.tsx — 대시보드는 2차. 1차는 상품 목록으로 보낸다.
import { redirect } from 'next/navigation';
export default function BomIndex() { redirect('/bom/products'); }
