import { jsPDF } from 'jspdf';

// Interfaz para los datos del pago que se usaran en el PDF
interface DatosPagoRecibo {
    id: string;
    inquilino: string;
    inquilinoDni: string;
    inmueble: string;
    inmuebleDireccion: string;
    nroCuota: number;
    fechaVencimiento: string;
    fechaPago: string;
    montoBase: number;
    mora: number;
    montoTotal: number;
    registradoPor: string;
    metodoPago?: string;
}

export function generatePaymentReceipt(datos: DatosPagoRecibo): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INMOGESTOR', 20, 25);

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestion Inmobiliaria', 20, 35);

    // Receipt number and date
    doc.setFontSize(12);
    doc.text(`RECIBO N° ${String(datos.id).padStart(6, '0')}`, pageWidth - 70, 25);
    doc.setFontSize(9);
    doc.text(`Fecha: ${formatDate(datos.fechaPago)}`, pageWidth - 70, 35);

    // Main content area
    let yPos = 70;

    // Title
    doc.setTextColor('#1a1a1a');
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE PAGO', pageWidth / 2, yPos, { align: 'center' });

    yPos += 20;

    // Info box - Inquilino
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, yPos, pageWidth - 30, 45, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#666666');
    doc.text('DATOS DEL INQUILINO', 25, yPos + 12);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1a1a1a');
    doc.text(datos.inquilino, 25, yPos + 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    doc.text(`DNI: ${datos.inquilinoDni}`, 25, yPos + 35);

    yPos += 55;

    // Info box - Inmueble
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, yPos, pageWidth - 30, 45, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#666666');
    doc.text('INMUEBLE', 25, yPos + 12);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1a1a1a');
    doc.text(datos.inmueble, 25, yPos + 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    doc.text(datos.inmuebleDireccion, 25, yPos + 35);

    yPos += 60;

    // Payment details table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1a1a1a');
    doc.text('DETALLE DEL PAGO', 25, yPos);

    yPos += 10;

    // Table header
    doc.setFillColor(67, 97, 238);
    doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCEPTO', 25, yPos + 8);
    doc.text('DETALLE', 100, yPos + 8);
    doc.text('IMPORTE', pageWidth - 35, yPos + 8, { align: 'right' });

    yPos += 15;

    // Table rows
    const rows = [
        { concepto: 'Cuota de Alquiler', detalle: `Cuota ${datos.nroCuota}`, importe: datos.montoBase },
        { concepto: 'Mora por Atraso', detalle: datos.mora > 0 ? 'Con mora' : 'Sin mora', importe: datos.mora },
    ];

    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#1a1a1a');

    rows.forEach((row, index) => {
        if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(15, yPos - 3, pageWidth - 30, 12, 'F');
        }
        doc.setFontSize(10);
        doc.text(row.concepto, 25, yPos + 5);
        doc.setTextColor('#666666');
        doc.text(row.detalle, 100, yPos + 5);
        doc.setTextColor('#1a1a1a');
        doc.text(formatCurrency(row.importe), pageWidth - 35, yPos + 5, { align: 'right' });
        yPos += 12;
    });

    // Total row
    yPos += 5;
    doc.setFillColor(26, 26, 26);
    doc.roundedRect(15, yPos, pageWidth - 30, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAGADO', 25, yPos + 11);
    doc.text(formatCurrency(datos.montoTotal), pageWidth - 35, yPos + 11, { align: 'right' });

    yPos += 35;

    // Additional info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    doc.text(`Fecha de vencimiento original: ${formatDate(datos.fechaVencimiento)}`, 25, yPos);
    yPos += 7;
    doc.text(`Fecha de pago efectivo: ${formatDate(datos.fechaPago)}`, 25, yPos);
    yPos += 7;
    if (datos.metodoPago) {
        doc.text(`Metodo de pago: ${datos.metodoPago}`, 25, yPos);
        yPos += 7;
    }

    yPos += 15;

    // Registered by section
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor('#666666');
    doc.text('Registrado por:', 25, yPos + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#1a1a1a');
    doc.text(datos.registradoPor, 25, yPos + 18);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 25;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, footerY - 10, pageWidth - 15, footerY - 10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    doc.text('Este comprobante es valido como constancia de pago.', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, pageWidth / 2, footerY + 7, { align: 'center' });

    // Save the PDF
    doc.save(`recibo-pago-${String(datos.id).padStart(6, '0')}.pdf`);
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}
