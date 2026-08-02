import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Activation {
  name: string
  steps?: string
  images?: string[]
}

interface Props {
  orderId?: string
  customerName?: string
  subscriptionInfo?: string
  images?: string[]
  items?: { name: string; qty: number; price: number }[]
  total?: number
  activations?: Activation[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US').format(Math.round(n)) + ' IQD'

const Email = ({
  orderId = '',
  customerName,
  subscriptionInfo,
  images = [],
  items = [],
  total,
  activations = [],
}: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تفاصيل اشتراكك من FPI STOR جاهزة</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>FPI STOR</Heading>
        <Text style={text}>
          {customerName ? `مرحباً ${customerName}،` : 'مرحباً،'}
        </Text>
        <Text style={text}>
          تم تسليم طلبك{orderId ? ` رقم #${orderId.slice(0, 8).toUpperCase()}` : ''} بنجاح 🎉
          تجد أدناه تفاصيل اشتراكك.
        </Text>

        {subscriptionInfo ? (
          <Section style={box}>
            <Text style={boxLabel}>معلومات الاشتراك</Text>
            <Text style={code}>{subscriptionInfo}</Text>
          </Section>
        ) : null}

        {images.map((url) => (
          <Img key={url} src={url} alt="تفاصيل الاشتراك" style={img} />
        ))}

        {items.length > 0 ? (
          <Section>
            <Hr style={hr} />
            <Text style={boxLabel}>المنتجات</Text>
            {items.map((i, idx) => (
              <Text key={idx} style={itemLine}>
                {i.name} × {i.qty} — {fmt(i.price * i.qty)}
              </Text>
            ))}
            {typeof total === 'number' ? (
              <Text style={totalLine}>الإجمالي: {fmt(total)}</Text>
            ) : null}
          </Section>
        ) : null}

        {activations.length > 0 ? (
          <Section>
            <Hr style={hr} />
            <Text style={sectionTitle}>خطوات التفعيل والصور</Text>
            {activations.map((a, idx) => (
              <Section key={idx}>
                <Text style={itemLine}>
                  <b>{a.name}</b>
                </Text>
                {a.steps ? <Text style={stepsText}>{a.steps}</Text> : null}
                {(a.images || []).map((url) => (
                  <Img key={url} src={url} alt={`خطوات تفعيل ${a.name}`} style={img} />
                ))}
              </Section>
            ))}
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={muted}>
          يمكنك الاطلاع على تفاصيل طلباتك في أي وقت من قسم «طلباتي» في الموقع.
        </Text>
        <Text style={muted}>للدعم: netflxstor@gmail.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'تفاصيل اشتراكك — FPI STOR',
  displayName: 'تسليم الطلب',
  previewData: {
    orderId: '9f1c2ab4-0000-0000-0000-000000000000',
    customerName: 'أحمد',
    subscriptionInfo: 'user: demo@fpistor.com | pass: 123456',
    images: [],
    items: [{ name: 'اشتراك Netflix شهر', qty: 1, price: 15000 }],
    total: 15000,
    activations: [
      {
        name: 'اشتراك Netflix شهر',
        steps: '1. افتح تطبيق Netflix\n2. اضغط تسجيل الدخول\n3. أدخل البريد وكلمة المرور المرسلة أعلاه',
        images: [],
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { color: '#e11d2f', fontSize: '26px', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: '#111827', textAlign: 'right' as const, lineHeight: '1.7' }
const box = {
  backgroundColor: '#0f0f11',
  border: '1px solid #e11d2f',
  borderRadius: '10px',
  padding: '16px',
  margin: '16px 0',
}
const boxLabel = { fontSize: '13px', color: '#9ca3af', margin: '0 0 8px', textAlign: 'right' as const }
const code = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#4ade80',
  margin: 0,
  wordBreak: 'break-all' as const,
  textAlign: 'right' as const,
}
const img = { width: '100%', borderRadius: '10px', margin: '10px 0', border: '1px solid #e5e7eb' }
const itemLine = { fontSize: '14px', color: '#111827', margin: '4px 0', textAlign: 'right' as const }
const totalLine = { fontSize: '16px', fontWeight: 'bold' as const, color: '#e11d2f', textAlign: 'right' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const muted = { fontSize: '12px', color: '#6b7280', textAlign: 'right' as const }

export default Email
