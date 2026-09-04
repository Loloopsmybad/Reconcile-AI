"""PDF report generator using ReportLab (pure Python, no system dependencies)."""

import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    KeepTogether, PageBreak, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ---------------------------------------------------------------------------
# Watermelon UI palette
# ---------------------------------------------------------------------------
PRIMARY     = colors.HexColor("#6D5CFF")
PRIMARY_DK  = colors.HexColor("#5040E0")
EMERALD     = colors.HexColor("#10B981")
AMBER       = colors.HexColor("#F59E0B")
ROSE        = colors.HexColor("#EF4444")
SKY         = colors.HexColor("#06B6D4")
DARK_BG     = colors.HexColor("#0F0F12")
MID_GRAY    = colors.HexColor("#71717A")
LIGHT_BG    = colors.HexColor("#FAFAFA")
ROW_ALT     = colors.HexColor("#F4F4F5")
WHITE       = colors.white
BLACK       = colors.HexColor("#18181B")

W, H = A4  # 595 x 842 points

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
def _styles():
    ss = getSampleStyleSheet()

    ss.add(ParagraphStyle("cover_title", fontSize=28, fontName="Helvetica-Bold",
                          textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=4))
    ss.add(ParagraphStyle("cover_sub", fontSize=13, fontName="Helvetica",
                          textColor=BLACK, alignment=TA_CENTER, spaceAfter=2))
    ss.add(ParagraphStyle("cover_date", fontSize=10, fontName="Helvetica",
                          textColor=MID_GRAY, alignment=TA_CENTER, spaceAfter=20))
    ss.add(ParagraphStyle("section", fontSize=14, fontName="Helvetica-Bold",
                          textColor=PRIMARY, spaceBefore=14, spaceAfter=6))
    ss.add(ParagraphStyle("subsection", fontSize=11, fontName="Helvetica-Bold",
                          textColor=BLACK, spaceBefore=8, spaceAfter=4))
    ss.add(ParagraphStyle("body", fontSize=9, fontName="Helvetica",
                          textColor=BLACK, spaceAfter=4))
    ss.add(ParagraphStyle("metric_big", fontSize=24, fontName="Helvetica-Bold",
                          textColor=PRIMARY, alignment=TA_CENTER))
    ss.add(ParagraphStyle("metric_label", fontSize=8, fontName="Helvetica",
                          textColor=MID_GRAY, alignment=TA_CENTER))
    ss.add(ParagraphStyle("small", fontSize=7, fontName="Helvetica",
                          textColor=BLACK))
    ss.add(ParagraphStyle("small_bold", fontSize=7, fontName="Helvetica-Bold",
                          textColor=BLACK))
    ss.add(ParagraphStyle("footer_text", fontSize=7, fontName="Helvetica",
                          textColor=MID_GRAY, alignment=TA_CENTER))
    return ss


def _header_footer(canvas, doc):
    canvas.saveState()
    # Header line
    canvas.setStrokeColor(PRIMARY)
    canvas.setLineWidth(0.6)
    canvas.line(20 * mm, H - 18 * mm, W - 20 * mm, H - 18 * mm)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.setFillColor(PRIMARY)
    canvas.drawString(20 * mm, H - 16 * mm, "Reconcile-AI")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MID_GRAY)
    canvas.drawRightString(W - 20 * mm, H - 16 * mm,
                           f"Settlement Report  •  {datetime.now().strftime('%d %b %Y')}")
    # Footer
    canvas.setStrokeColor(colors.HexColor("#E4E4E7"))
    canvas.line(20 * mm, 18 * mm, W - 20 * mm, 18 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MID_GRAY)
    canvas.drawCentredString(W / 2, 13 * mm, f"Page {doc.page}")
    canvas.drawRightString(W - 20 * mm, 13 * mm, "Confidential")
    canvas.restoreState()


def _first_page(canvas, doc):
    """Cover page — no header/footer."""
    pass


# ---------------------------------------------------------------------------
# Table helper
# ---------------------------------------------------------------------------
def _styled_table(data, col_widths, header_color=PRIMARY, font_size=7.5):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND",    (0, 0), (-1, 0), header_color),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), font_size),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), font_size),
        ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("GRID",          (0, 0), (-1, -1), 0.4, colors.HexColor("#E4E4E7")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, ROW_ALT]),
    ]
    t.setStyle(TableStyle(style))
    return t


def _section(text, styles):
    return Paragraph(text, styles["section"])


def _subsection(text, styles):
    return Paragraph(text, styles["subsection"])


# ---------------------------------------------------------------------------
# Cover page metric boxes
# ---------------------------------------------------------------------------
def _metric_box(value, label, color, styles):
    """Return a mini table that looks like a metric card."""
    data = [
        [Paragraph(f'<font color="{color.hexval()}" size="20"><b>{value}</b></font>', styles["body"])],
        [Paragraph(f'<font color="#71717A" size="7">{label}</font>', styles["body"])],
    ]
    t = Table(data, colWidths=[100])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (0, 0), 10),
        ("BOTTOMPADDING", (0, -1), (0, -1), 8),
        ("LINEABOVE", (0, 0), (0, 0), 3, color),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
    ]))
    return t


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------
def build_pdf(
    metrics: dict,
    matches: list[dict],
    unmatched: list[dict],
    anomalies: list[dict] | None = None,
    analytics: dict | None = None,
    elapsed: float = 0.0,
) -> io.BytesIO:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=24 * mm, bottomMargin=22 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
    )
    S = _styles()
    elements: list = []

    # ── COVER PAGE ──────────────────────────────────────────────────────
    elements.append(Spacer(1, 40 * mm))
    elements.append(Paragraph("Reconcile-AI", S["cover_title"]))
    elements.append(Paragraph("Settlement Reconciliation Report", S["cover_sub"]))
    elements.append(HRFlowable(width="40%", thickness=1, color=PRIMARY, spaceAfter=10))
    total = metrics.get("total_transactions", 0)
    elements.append(Paragraph(f"Dataset: {total} transactions  •  {datetime.now(timezone.utc).strftime('%d %B %Y')}", S["cover_date"]))

    # Metric boxes row
    accuracy = f'{metrics.get("true_accuracy", 0) * 100:.1f}%'
    correct  = str(metrics.get("correct", 0))
    wrong    = str(metrics.get("wrong", 0))
    exc_n    = len(unmatched)
    boxes = [
        _metric_box(accuracy, "True Accuracy", EMERALD, S),
        _metric_box(correct, "Correct", PRIMARY, S),
        _metric_box(wrong, "Wrong", ROSE, S),
        _metric_box(str(exc_n), "Exceptions", AMBER, S),
    ]
    row = Table([boxes], colWidths=[110] * 4)
    row.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"),
                              ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(row)
    elements.append(Spacer(1, 20 * mm))
    elements.append(Paragraph(
        f'<font color="#71717A" size="8">Processing time: {elapsed:.1f}s  •  '
        f'Exception precision: {metrics.get("exception_precision", 0) * 100:.0f}%  •  '
        f'Exception recall: {metrics.get("exception_recall", 0) * 100:.0f}%  •  '
        f'Anomalies detected: {len(anomalies) if anomalies else 0}</font>', S["body"]))
    elements.append(PageBreak())

    # ── SECTION 1: ACCURACY SUMMARY ────────────────────────────────────
    elements.append(_section("Accuracy Summary", S))
    acc_data = [
        ["Metric", "Value"],
        ["Total Transactions", str(total)],
        ["True Accuracy", f'{metrics.get("true_accuracy", 0) * 100:.1f}%'],
        ["Correct Matches", correct],
        ["Wrong Matches", wrong],
        ["Exception Precision", f'{metrics.get("exception_precision", 0) * 100:.1f}%'],
        ["Exception Recall", f'{metrics.get("exception_recall", 0) * 100:.1f}%'],
    ]
    elements.append(_styled_table(acc_data, [200, 140], PRIMARY, 8))
    elements.append(Spacer(1, 6 * mm))

    # Per-fault breakdown
    per_fault = metrics.get("per_fault_type", {})
    if per_fault:
        elements.append(_subsection("Per-Fault-Type Breakdown", S))
        ft_data = [["Fault Type", "Total", "Correct", "Accuracy"]]
        for name, v in per_fault.items():
            ft_data.append([name, str(v.get("total", 0)), str(v.get("correct", 0)),
                            f'{v.get("accuracy", 0) * 100:.0f}%'])
        elements.append(_styled_table(ft_data, [130, 70, 70, 80], EMERALD, 8))
        elements.append(Spacer(1, 6 * mm))

    # ── SECTION 2: MATCHED TRANSACTIONS ─────────────────────────────────
    if matches:
        elements.append(_section("Matched Transactions", S))
        m_data = [["Settlement ID", "Bank Txn ID", "Tier", "Confidence", "Reason Code"]]
        for m in matches[:40]:
            m_data.append([
                Paragraph(m.get("razorpay_id", ""), S["small"]),
                Paragraph(m.get("bank_id", ""), S["small"]),
                f'T{m.get("tier", 0)}',
                f'{m.get("confidence", 0) * 100:.0f}%',
                Paragraph(str(m.get("reason_code", ""))[:28], S["small"]),
            ])
        elements.append(_styled_table(m_data, [95, 90, 30, 55, 110], PRIMARY, 7))
        elements.append(Spacer(1, 6 * mm))

    # ── SECTION 3: EXCEPTIONS ───────────────────────────────────────────
    if unmatched:
        elements.append(_section("Honest Exceptions", S))
        e_data = [["Record ID", "Amount", "Date", "Reason Code", "Suggestion"]]
        for u in unmatched:
            e_data.append([
                Paragraph(str(u.get("id", u.get("razorpay_id", ""))), S["small"]),
                f'₹{u.get("amount", 0):,.2f}',
                str(u.get("date", ""))[:10],
                Paragraph(str(u.get("reason_code", ""))[:24], S["small"]),
                Paragraph(str(u.get("suggestion", ""))[:36], S["small"]),
            ])
        elements.append(_styled_table(e_data, [80, 60, 60, 90, 140], AMBER, 7))
        elements.append(Spacer(1, 6 * mm))

    # ── SECTION 4: ANOMALIES ────────────────────────────────────────────
    if anomalies:
        elements.append(_section("Detected Anomalies", S))
        a_data = [["Kind", "Related Records", "Details"]]
        for a in anomalies[:20]:
            a_data.append([
                Paragraph(a.get("kind", ""), S["small"]),
                Paragraph(", ".join(a.get("related_records", []))[:40], S["small"]),
                Paragraph(str(a.get("details", ""))[:50], S["small"]),
            ])
        elements.append(_styled_table(a_data, [90, 150, 180], ROSE, 7))
        elements.append(Spacer(1, 6 * mm))

    # ── SECTION 5: BUSINESS INTELLIGENCE ────────────────────────────────
    if analytics:
        elements.append(_section("Business Intelligence", S))

        # Revenue Leakage
        rl = analytics.get("revenue_leakage", {})
        if rl:
            elements.append(_subsection("Revenue Leakage", S))
            rl_data = [["Category", "Count", "Total Amount"]]
            rl_data.append(["Fee Overcharges", str(rl.get("fee_overcharge", {}).get("count", 0)),
                            f'₹{rl.get("fee_overcharge", {}).get("total_amount", 0):,.2f}'])
            rl_data.append(["Duplicate Settlements", str(rl.get("duplicate_settlements", {}).get("count", 0)),
                            f'₹{rl.get("duplicate_settlements", {}).get("total_amount", 0):,.2f}'])
            rl_data.append(["Orphan Float", str(rl.get("orphan_float", {}).get("count", 0)),
                            f'₹{rl.get("orphan_float", {}).get("total_amount", 0):,.2f}'])
            rl_data.append(["Total Leakage", "",
                            Paragraph(f'<b>₹{rl.get("total_leakage", 0):,.2f}</b>', S["small"])])
            elements.append(_styled_table(rl_data, [150, 60, 130], ROSE, 8))
            elements.append(Spacer(1, 4 * mm))

        # Payment Mode Profitability
        pmp = analytics.get("payment_mode_profitability", {})
        modes = pmp.get("modes", [])
        if modes:
            elements.append(_subsection("Payment Mode Profitability", S))
            pm_data = [["Mode", "Volume", "Fees", "Take Rate", "Txns"]]
            for mode in modes:
                pm_data.append([
                    mode.get("payment_mode", ""),
                    f'₹{mode.get("gross_volume", 0):,.2f}',
                    f'₹{mode.get("total_fees", 0):,.2f}',
                    f'{mode.get("effective_take_rate_pct", 0):.1f}%',
                    str(mode.get("transaction_count", 0)),
                ])
            elements.append(_styled_table(pm_data, [80, 90, 80, 65, 45], PRIMARY, 8))
            elements.append(Spacer(1, 4 * mm))

        # Settlement Velocity
        sv = analytics.get("settlement_velocity", {})
        if sv:
            elements.append(_subsection("Settlement Velocity", S))
            sv_data = [
                ["Metric", "Value"],
                ["Average Days", f'{sv.get("avg_days", 0):.1f}d'],
                ["Median Days", f'{sv.get("median_days", 0):.1f}d'],
                ["Max Days", f'{sv.get("max_days", 0)}d'],
                ["Delayed (>3 days)", f'{sv.get("delayed_count", 0)} ({sv.get("delayed_rate_pct", 0):.1f}%)'],
            ]
            elements.append(_styled_table(sv_data, [150, 130], SKY, 8))
            elements.append(Spacer(1, 4 * mm))

        # Merchant Risk
        mrs = analytics.get("merchant_risk_scores", {})
        merchants = mrs.get("merchants", [])
        if merchants:
            elements.append(_subsection("Merchant Risk Scoring", S))
            mr_data = [["Merchant", "Score", "Risk", "Orphan%", "Fee Disc%", "Avg Delay"]]
            for m in merchants[:10]:
                bd = m.get("breakdown", {})
                mr_data.append([
                    m.get("merchant", ""),
                    str(m.get("composite_score", 0)),
                    m.get("risk_level", ""),
                    f'{bd.get("orphan_rate_pct", 0):.1f}%',
                    f'{bd.get("fee_discrepancy_rate_pct", 0):.1f}%',
                    f'{bd.get("avg_settlement_delay_days", 0):.1f}d',
                ])
            elements.append(_styled_table(mr_data, [90, 40, 45, 50, 55, 55], PRIMARY, 8))

    doc.build(elements, onFirstPage=_first_page, onLaterPages=_header_footer)
    buf.seek(0)
    return buf
