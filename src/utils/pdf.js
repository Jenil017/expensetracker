function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d)) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d)) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

function fmtRs(amount) {
  const n = Math.abs(Number(amount) || 0)
  return 'Rs.' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

export async function downloadPersonPDF({ person, transactions, dateLabel }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PRIMARY  = [44, 94, 173]
  const PRIMARY2 = [21, 145, 220]
  const GREEN    = [22, 163, 74]
  const RED      = [220, 38, 38]
  const DARK     = [15, 30, 60]
  const GRAY     = [120, 140, 170]
  const LGRAY    = [235, 242, 252]

  // ── Header band ──────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, 210, 46, 'F')

  // Subtle diagonal accent
  doc.setFillColor(...PRIMARY2)
  doc.triangle(148, 0, 210, 0, 210, 46, 'F')

  // App name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Transaction Buddy', 14, 17)

  // Sub info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(196, 226, 245)
  doc.text(`Account Statement — ${person.name}`, 14, 27)
  doc.text(`Period: ${dateLabel}`, 14, 35)

  // Generated date (right-aligned)
  const genDate = fmtDate(new Date().toISOString().slice(0, 10))
  const genTime = fmtTime(new Date().toISOString())
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text(`Generated: ${genDate} ${genTime}`, 196, 35, { align: 'right' })

  // ── Summary boxes ────────────────────────────────────────────────────
  const sentTotal     = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)
  const receivedTotal = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0)
  const balance       = sentTotal - receivedTotal

  const boxY = 54
  const boxes = [
    { label: 'Total Sent',     value: fmtRs(sentTotal),     color: GREEN },
    { label: 'Total Received', value: fmtRs(receivedTotal), color: RED },
    { label: 'Net Balance',    value: fmtRs(Math.abs(balance)), color: balance >= 0 ? GREEN : RED },
  ]
  boxes.forEach((b, i) => {
    const x = 14 + i * 62
    doc.setFillColor(248, 251, 255)
    doc.setDrawColor(220, 235, 250)
    doc.roundedRect(x, boxY, 58, 24, 3, 3, 'FD')

    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(b.label, x + 5, boxY + 9)

    doc.setTextColor(...b.color)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(b.value, x + 5, boxY + 19)
  })

  // Balance note
  const noteY = boxY + 30
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  if (balance === 0) {
    doc.setTextColor(...GRAY)
    doc.text('All settled up.', 14, noteY)
  } else if (balance > 0) {
    doc.setTextColor(...GREEN)
    doc.text(`${person.name} owes you ${fmtRs(balance)}`, 14, noteY)
  } else {
    doc.setTextColor(...RED)
    doc.text(`You owe ${person.name} ${fmtRs(Math.abs(balance))}`, 14, noteY)
  }

  // Entry count
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`${transactions.length} entr${transactions.length !== 1 ? 'ies' : 'y'}`, 196, noteY, { align: 'right' })

  // ── Transaction table ─────────────────────────────────────────────────
  const tableRows = transactions.map(t => [
    fmtDate(t.date),
    fmtTime(t.createdAt),
    t.description || (t.type === 'credit' ? 'Sent' : 'Received'),
    t.type === 'credit' ? fmtRs(t.amount) : '',
    t.type === 'debit'  ? fmtRs(t.amount) : '',
  ])

  autoTable(doc, {
    startY: noteY + 6,
    head: [['Date', 'Time', 'Description', 'Sent (To Collect)', 'Received (To Pay)']],
    body: tableRows,
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      textColor: DARK,
    },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 16 },
      2: { cellWidth: 72 },
      3: { cellWidth: 38, textColor: GREEN, fontStyle: 'bold', halign: 'right' },
      4: { cellWidth: 38, textColor: RED,   fontStyle: 'bold', halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [210, 225, 245],
    tableLineWidth: 0.2,
    didDrawPage: (data) => {
      // Running total on the right of each page header
    },
  })

  // ── Footer on every page ──────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Bottom line
    doc.setDrawColor(...PRIMARY)
    doc.setLineWidth(0.4)
    doc.line(14, 284, 196, 284)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Transaction Buddy — Personal Finance Tracker', 14, 289)
    doc.text(`Page ${i} of ${totalPages}`, 196, 289, { align: 'right' })
  }

  const safeName = person.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const dateTag  = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  doc.save(`khatabook_${safeName}_${dateTag}.pdf`)
}
