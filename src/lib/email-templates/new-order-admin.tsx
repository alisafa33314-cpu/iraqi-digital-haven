import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  orderId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  paymentMethod?: string
  items?: { name: string; qty: number; price: number }[]
  total?: number
  proofUrl?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US').format(Math.round(n)) + ' IQD'

const Email = ({
  orderId = '',
  customerName,
  customerPhone,
  customerEmail,
  paymentMethod,
  items = [],
  total,
  proofUrl,
}: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>طلب جديد في FPI STOR</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>FPI STOR</Heading>
        <Text style={text}>
          🔔 وصل طلب جديد
          {orderId ? ` رقم #${orderId.slice(0, 8).toUpperCase()}` : ''}.
        </Text>

        <Section style={box}>
          <Text style={row}>الاسم: {customerName || '—'}</Text>
          <Text style={row}>الهاتف: {customerPhone || '—'}</Text>
          <Text style={row}>الإيميل: {customerEmail || '—'}</Text>
          <Text style={row}>طريقة الدفع: {paymentMethod || '—'}</Text>
        </Section>

        {items.length > 0 ? (
          <Section style={box}>
            <Text style={boxLabel}>المنتجات</Text>
            {items.map((i, idx) => (
              <Text key={idx} style={row}>
                {i.name} × {i.qty} — {fmt(i.price * i.qty)}
              </Text>
            ))}
          </Section>
        ) : null}

        {typeof total === 'number' ? (
          <Text style={totalText}>الإجمالي: {fmt(total)}</Text>
        ) : null}

        {proofUrl ? <Text style={row}>إثبات الدفع: {proofUrl}</Text> : null}

        <Hr style={hr} />
        <Text style={muted}>إشعار داخلي من متجر FPI STOR</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'طلب جديد — FPI STOR',
  displayName: 'إشعار طلب جديد (إدارة)',
  to: 'netflxstor@gmail.com',
  previewData: {
    orderId: '0f3a19c2-1111-2222-3333-444455556666',
    customerName: 'أحمد',
    customerPhone: '07700000000',
    customerEmail: 'test@example.com',
    paymentMethod: 'زين كاش',
    items: [{ name: 'اشتراك Netflix', qty: 1, price: 15000 }],
    total: 15000,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { color: '#e11d2a', fontSize: '24px', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#111827', lineHeight: '24px' }
const box = {
  backgroundColor: '#f6f7f9',
  borderRadius: '10px',
  padding: '14px 16px',
  margin: '12px 0',
}
const boxLabel = { fontSize: '13px', color: '#6b7280', margin: '0 0 6px', fontWeight: 700 }
const row = { fontSize: '14px', color: '#111827', margin: '4px 0' }
const totalText = { fontSize: '17px', fontWeight: 700, color: '#111827', margin: '12px 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const muted = { fontSize: '12px', color: '#6b7280' }
