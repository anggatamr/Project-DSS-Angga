import io
import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.models.database import Project, Criteria, Alternative, MatrixValue
from app.services.saw import solve_saw
from app.services.topsis import solve_topsis

class NumberedCanvas(canvas.Canvas):
    """
    Custom canvas to handle total page count dynamically.
    Adds 'Page X of Y' footer on every page except first page if desired.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#7C7267")) # Earthy gray secondary text
        
        # Header (on all pages except page 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "LAPORAN HASIL SISTEM PENDUKUNG KEPUTUSAN (SPK)")
            self.setStrokeColor(colors.HexColor("#EFEAE2"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612-54, 742)
            
        # Footer
        page_text = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(612 - 54, 36, page_text)
        self.drawString(54, 36, f"Dicetak pada: {datetime.datetime.now().strftime('%d-%m-%Y %H:%M:%S')}")
        self.restoreState()

def generate_pdf_report(project_id: str, db: Session) -> io.BytesIO:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found")

    criterias = db.query(Criteria).filter(Criteria.project_id == project_id).order_by(Criteria.name).all()
    alternatives = db.query(Alternative).filter(Alternative.project_id == project_id).order_by(Alternative.name).all()
    
    if not criterias or not alternatives:
        raise ValueError("Project contains no criterias or alternatives")

    # Reconstruct decision matrix
    crit_ids = [c.id for c in criterias]
    alt_ids = [a.id for a in alternatives]
    matrix_2d = [[0.0 for _ in range(len(crit_ids))] for _ in range(len(alt_ids))]
    
    cells = db.query(MatrixValue).filter(MatrixValue.project_id == project_id).all()
    cell_map = {(c.alternative_id, c.criteria_id): c.value for c in cells}
    
    for i, alt_id in enumerate(alt_ids):
        for j, crit_id in enumerate(crit_ids):
            matrix_2d[i][j] = cell_map.get((alt_id, crit_id), 0.0)

    weights = [c.weight for c in criterias]
    criteria_types = [c.type for c in criterias]
    
    method = project.chosen_method or "TOPSIS"
    
    # Compute results
    if method == "SAW":
        results = solve_saw(matrix_2d, weights, criteria_types)
    else:
        results = solve_topsis(matrix_2d, weights, criteria_types)

    # Rank alternatives
    scores = results["scores"]
    ranked_alternatives = []
    for idx, alt in enumerate(alternatives):
        ranked_alternatives.append({
            "name": alt.name,
            "score": scores[idx]
        })
    ranked_alternatives = sorted(ranked_alternatives, key=lambda x: x["score"], reverse=True)

    buffer = io.BytesIO()
    # letter page is 612 x 792 pt. Margins = 0.75in (54pt)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Warm earth theme color styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#3E362E"), # Warm charcoal
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#7C7267"), # Earthy gray
        spaceAfter=30
    )

    h1_style = ParagraphStyle(
        'DocH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#3E362E"),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#3E362E"),
        spaceAfter=10
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=1 # Center
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#3E362E")
    )
    
    table_cell_center = ParagraphStyle(
        'TableCellCenter',
        parent=table_cell_style,
        alignment=1
    )

    story = []

    # 1. Title Page / Header Block
    story.append(Paragraph("LAPORAN HASIL SISTEM PENDUKUNG KEPUTUSAN", title_style))
    story.append(Paragraph(f"<b>Mata Kuliah:</b> Teori Pengambilan Keputusan<br/><b>Nama Proyek:</b> {project.title}<br/><b>Metode Komputasi:</b> {method}", subtitle_style))
    story.append(Spacer(1, 10))

    # 2. Section: Kriteria & Pembobotan
    story.append(Paragraph("I. Kriteria & Pembobotan", h1_style))
    story.append(Paragraph("Berikut adalah tabel kriteria keputusan beserta bobot prioritas dan tipe kriteria (Benefit atau Cost):", body_style))
    
    crit_table_data = [[
        Paragraph("No", table_header_style),
        Paragraph("Nama Kriteria", table_header_style),
        Paragraph("Tipe Kriteria", table_header_style),
        Paragraph("Bobot", table_header_style)
    ]]
    for idx, c in enumerate(criterias):
        crit_table_data.append([
            Paragraph(str(idx+1), table_cell_center),
            Paragraph(c.name, table_cell_style),
            Paragraph("Benefit (Keuntungan)" if c.type == "benefit" else "Cost (Biaya)", table_cell_style),
            Paragraph(f"{c.weight:.4f} ({c.weight*100:.1f}%)", table_cell_center)
        ])
    
    t1 = Table(crit_table_data, colWidths=[40, 220, 140, 104])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#D37B55")), # Accent primary terracotta
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#EFEAE2")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#FAF6F0")]),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ('TOPPADDING', (0,1), (-1,-1), 6),
    ]))
    story.append(t1)
    story.append(Spacer(1, 15))

    # 3. Section: Matriks Keputusan Awal
    story.append(Paragraph("II. Matriks Keputusan Awal", h1_style))
    story.append(Paragraph("Nilai matriks keputusan dari setiap kriteria terhadap alternatif (menampilkan hingga 15 alternatif pertama untuk efisiensi halaman):", body_style))
    
    # We build header: [Alternatif, C1, C2, ...]
    matrix_header = [Paragraph("Alternatif", table_header_style)]
    for c in criterias:
        matrix_header.append(Paragraph(c.name, table_header_style))
    
    matrix_table_data = [matrix_header]
    
    # For representation, if too many alternatives, display only 15 in details, but note it
    display_limit = min(len(alternatives), 15)
    for i in range(display_limit):
        row_data = [Paragraph(alternatives[i].name, table_cell_style)]
        for j in range(len(criterias)):
            val = matrix_2d[i][j]
            row_data.append(Paragraph(f"{val:.2f}", table_cell_center))
        matrix_table_data.append(row_data)
        
    # Column width calculation: total space is 504pt (612 - 108)
    n_c = len(criterias)
    alt_col_width = 184
    crit_col_width = 320 / n_c
    col_widths = [alt_col_width] + [crit_col_width] * n_c
    
    t2 = Table(matrix_table_data, colWidths=col_widths)
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#3E362E")), # Dark bronze
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#EFEAE2")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#FAF6F0")]),
        ('BOTTOMPADDING', (0,1), (-1,-1), 5),
        ('TOPPADDING', (0,1), (-1,-1), 5),
    ]))
    story.append(t2)
    if len(alternatives) > 15:
        story.append(Paragraph(f"<i>*Catatan: Menampilkan {15} dari {len(alternatives)} alternatif dalam tabel rincian matriks ini.</i>", ParagraphStyle('Muted', parent=body_style, fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor("#7C7267"))))
    
    story.append(Spacer(1, 15))

    # 4. Section: Hasil & Peringkat Akhir
    story.append(Paragraph("III. Hasil Akhir & Peringkat Alternatif", h1_style))
    story.append(Paragraph(f"Hasil perhitungan menggunakan metode <b>{method}</b>. Alternatif dengan skor tertinggi menempati peringkat pertama:", body_style))
    
    rank_table_data = [[
        Paragraph("Peringkat", table_header_style),
        Paragraph("Nama Alternatif", table_header_style),
        Paragraph("Skor Akhir", table_header_style)
    ]]
    for rank_idx, item in enumerate(ranked_alternatives):
        # We can highlight top 3
        bg_style = table_cell_style
        if rank_idx == 0:
            bg_style = ParagraphStyle('Rank1', parent=table_cell_style, fontName='Helvetica-Bold', textColor=colors.HexColor("#D37B55"))
        elif rank_idx < 3:
            bg_style = ParagraphStyle('Rank23', parent=table_cell_style, fontName='Helvetica-Bold')
            
        rank_table_data.append([
            Paragraph(str(rank_idx+1), table_cell_center),
            Paragraph(item["name"], bg_style),
            Paragraph(f"{item['score']:.4f}", table_cell_center)
        ])
        
    t3 = Table(rank_table_data, colWidths=[80, 304, 120])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#D37B55")), # Primary orange
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#EFEAE2")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#FAF6F0")]),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ('TOPPADDING', (0,1), (-1,-1), 6),
    ]))
    story.append(t3)
    
    # Sign off block
    story.append(Spacer(1, 30))
    
    sign_block = []
    sign_block.append(Paragraph("Laporan ini diterbitkan secara otomatis oleh sistem komputasi keputusan akademik.", ParagraphStyle('SignMuted', parent=body_style, fontSize=8, textColor=colors.HexColor("#7C7267"))))
    story.append(KeepTogether(sign_block))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    
    buffer.seek(0)
    return buffer
