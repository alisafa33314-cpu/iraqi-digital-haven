import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  orderId?: string
  customerName?: string
  items?: { name: string; qty: number; price: number }[]
  total?: number
  ordersUrl?: string
}

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' IQD'

const Email = ({ orderId = '', customerName, items = [], total, ordersUrl = 'https://fpistor.com/orders' }: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تم استلام طلبك وسيتم إكماله بأسرع وقت</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>FPI STOR</Heading>
        <Text style={text}>{customerName ? `مرحباً ${customerName}،` : 'مرحباً،'}</Text>
        <Text style={text}>
          تم استلام طلبك{orderId ? ` رقم #${orderId.slice(0, 8).toUpperCase()}` : ''} ✅
          <br />
          سيتم إكماله بأسرع وقت، الرجاء الانتظار.
        </Text>

        {items.length > 0 ? (
          <Section>
            <Hr style={hr} />
            {items.map((i, idx) => (
              <Text key={idx} style={itemLine}>{i.name} × {i.qty} — {fmt(i.price * i.qty)}</Text>
            ))}
            {typeof total === 'number' ? <Text style={totalLine}>الإجمالي: {fmt(total)}</Text> : null}
          </Section>
        ) : null}

        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={ordersUrl} style={button}>حالة الطلب</Button>
        </Section>

        <Hr style={hr} />
        <Text style={muted}>للدعم: netflxstor@gmail.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'تم استلام طلبك — FPI STOR',
  displayName: 'تأكيد استلام الطلب',
  previewData: {
    orderId: '9f1c2ab4-0000-0000-0000-000000000000',
    customerName: 'أحمد',
    items: [{ name: 'اشتراك Netflix شهر', qty: 1, price: 15000 }],
    total: 15000,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { color: '#e11d2f', fontSize: '26px', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: '#111827', textAlign: 'right' as const, lineHeight: '1.8' }
const itemLine = { fontSize: '14px', color: '#111827', margin: '4px 0', textAlign: 'right' as const }
const totalLine = { fontSize: '16px', fontWeight: 'bold' as const, color: '#e11d2f', textAlign: 'right' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const muted = { fontSize: '12px', color: '#6b7280', textAlign: 'right' as const }
const button = {
  backgroundColor: '#e11d2f', color: '#ffffff', padding: '12px 28px', borderRadius: '10px',
  fontWeight: 'bold' as const, fontSize: '15px', textDecoration: 'none',
}

export default Email
