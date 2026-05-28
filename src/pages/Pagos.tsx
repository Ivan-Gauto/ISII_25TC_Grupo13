import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Container, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, IconButton, Tooltip, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar,
  MenuItem, Select, Badge
} from '@mui/material';
import {
  ReceiptOutlined as ReceiptIcon,
  CancelOutlined as CancelIcon,
  PaymentOutlined as PaymentIcon,
  CloseOutlined as CloseIcon,
  PersonOutlined as PersonIcon,
  HomeWorkOutlined as HomeWorkIcon,
  EditOutlined as EditIcon,
  CalendarTodayOutlined as CalendarIcon,
  AttachMoneyOutlined as MoneyIcon,
  CheckCircleOutlined as ApproveIcon,
  RemoveCircleOutlined as RejectIcon,
  NotificationsOutlined as NotificationsIcon,
  DeleteOutlined as DeleteIcon
} from '@mui/icons-material';
import { pagosApi } from '../api/pagos';
import { contratosApi } from '../api/contratos';
import { inquilinosApi } from '../api/inquilinos';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { SearchInput } from '../components/common/SearchInput';
import { StatusChip } from '../components/common/StatusChip';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ESTADOS_PAGO } from '../utils/constants';
import { generatePaymentReceipt } from '../lib/pdf-generator';
import type { Pago, CuotaPendiente, RegistrarPagoRequest, DetallePagoResponse } from '../types/pago';
import type { Contrato } from '../types/contrato';
import type { Inquilino } from '../types/inquilino';

// Tipos para notificaciones
interface Notificacion {
  id: string;
  tipo: 'rechazo' | 'aprobacion' | 'info';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  pagoId?: number;
}

const initialFormData: RegistrarPagoRequest = {
  idCuota: '',
  idMetodoPago: '',
  monto: 0,
  periodo: ''
};

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering state
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog state for confirming void
  const [anularDialog, setAnularDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [dialogLoading, setDialogLoading] = useState(false);

  // Dialog state for confirm/reject
  const [actionDialog, setActionDialog] = useState<{ open: boolean; id: number | null; action: 'confirmar' | 'rechazar' | null }>({ open: false, id: null, action: null });

  // NEW: Estado para motivo de rechazo
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Dialog state for registering payment
  const [registrarDialog, setRegistrarDialog] = useState(false);
  const [registrarLoading, setRegistrarLoading] = useState(false);
  const [formData, setFormData] = useState<RegistrarPagoRequest>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedInquilinoId, setSelectedInquilinoId] = useState<string>('');
  const [contratosInquilino, setContratosInquilino] = useState<Contrato[]>([]);
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [cuotaPendiente, setCuotaPendiente] = useState<CuotaPendiente | null>(null);
  const [detallePago, setDetallePago] = useState<DetallePagoResponse | null>(null);

  // Success snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '' });

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);

  // NEW: Sistema de notificaciones
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionesOpen, setNotificacionesOpen] = useState(false);

  const { canConfirmar, canRechazar, isOperador, user } = useAuth();

  // Cargar notificaciones del localStorage al iniciar
  useEffect(() => {
    const savedNotificaciones = localStorage.getItem(`notificaciones_${user?.usuarioId}`);
    if (savedNotificaciones) {
      const parsed = JSON.parse(savedNotificaciones);
      setNotificaciones(parsed.map((n: Notificacion) => ({ ...n, fecha: new Date(n.fecha) })));
    }
  }, [user?.usuarioId]);

  // Guardar notificaciones en localStorage cuando cambien
  useEffect(() => {
    if (user?.usuarioId && notificaciones.length > 0) {
      localStorage.setItem(`notificaciones_${user.usuarioId}`, JSON.stringify(notificaciones));
    }
  }, [notificaciones, user?.usuarioId]);

  const notificacionesNoLeidas = useMemo(() => notificaciones.filter(n => !n.leida).length, [notificaciones]);

  const agregarNotificacion = (notif: Omit<Notificacion, 'id' | 'fecha' | 'leida'>) => {
    const nueva: Notificacion = {
      ...notif,
      id: Date.now().toString(),
      fecha: new Date(),
      leida: false
    };
    setNotificaciones(prev => [nueva, ...prev]);
  };

  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const eliminarNotificacion = (id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  const marcarTodasComoLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const fetchPagos = async () => {
    try {
      setLoading(true);
      setError(null);
      const dataPagos = await pagosApi.listar();
      setPagos(dataPagos);
      const dataContratos = await contratosApi.listar();
      setContratos(dataContratos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  const openRegistrarDialog = async () => {
    try {
      setLoading(true);
      const dataInquilinos = await inquilinosApi.listarConContratos();
      setInquilinos(dataInquilinos);
      setContratosInquilino([]);
      setCuotaPendiente(null);
      setDetallePago(null);
      setSelectedInquilinoId('');
      setSelectedContratoId('');
      setFormData(initialFormData);
      setRegistrarDialog(true);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      alert('Error al cargar datos. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagos();
  }, []);

  const handleAnular = async () => {
    if (!anularDialog.id) return;
    try {
      setDialogLoading(true);
      await pagosApi.anular(anularDialog.id);
      setAnularDialog({ open: false, id: null });
      fetchPagos();
      setSnackbar({ open: true, message: 'Pago anulado exitosamente', severity: 'success' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al anular pago');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleConfirmar = async () => {
    if (!actionDialog.id) return;
    try {
      setDialogLoading(true);
      await pagosApi.confirmar(actionDialog.id);
      setActionDialog({ open: false, id: null, action: null });
      fetchPagos();
      setSnackbar({ open: true, message: 'Pago confirmado exitosamente', severity: 'success' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al confirmar el pago');
    } finally {
      setDialogLoading(false);
    }
  };

  // UPDATED: Rechazar con motivo
  const handleRechazar = async () => {
    if (!actionDialog.id) return;
    if (!motivoRechazo.trim()) {
      setSnackbar({ open: true, message: 'Debe ingresar un motivo de rechazo', severity: 'warning' });
      return;
    }
    try {
      setDialogLoading(true);
      // Llamar al endpoint con motivo
      await pagosApi.rechazarConMotivo(actionDialog.id, motivoRechazo);

      // Obtener datos del pago para la notificacion
      const pagoRechazado = pagos.find(p => p.id === actionDialog.id);

      // Crear notificacion para el operador que registro el pago
      if (pagoRechazado) {
        agregarNotificacion({
          tipo: 'rechazo',
          titulo: 'Solicitud de pago rechazada',
          mensaje: `El pago de ${pagoRechazado.inquilino} para ${pagoRechazado.inmueble} (Cuota ${pagoRechazado.nroCuota}) fue rechazado. Motivo: ${motivoRechazo}`,
          pagoId: actionDialog.id
        });
      }

      setActionDialog({ open: false, id: null, action: null });
      setMotivoRechazo('');
      fetchPagos();
      setSnackbar({ open: true, message: 'Pago rechazado correctamente', severity: 'info' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al rechazar el pago');
    } finally {
      setDialogLoading(false);
    }
  };

  // NEW: Generar y descargar recibo PDF
  const handleDescargarRecibo = (pago: Pago) => {
    const contratoDelPago = contratos.find(c => c.id === String(pago.contratoId));

    const datosPago = {
      id: pago.id,
      inquilino: pago.inquilino,
      inquilinoDni: contratoDelPago?.dniInquilino || 'N/A',
      inmueble: pago.inmueble,
      inmuebleDireccion: contratoDelPago?.direccion || pago.inmueble,
      nroCuota: pago.nroCuota,
      fechaVencimiento: pago.fechaVencimiento,
      fechaPago: pago.fechaPago || new Date().toISOString(),
      montoBase: pago.monto - pago.mora,
      mora: pago.mora,
      montoTotal: pago.monto,
      registradoPor: user?.nombre || 'Sistema',
      metodoPago: 'Efectivo' // Puedes obtener esto de la API si lo tienes
    };

    generatePaymentReceipt(datosPago);
    setSnackbar({ open: true, message: 'Recibo descargado correctamente', severity: 'success' });
  };

  const handleRegistrarPago = async () => {
    setFormError(null);

    if (!selectedContratoId) {
      setFormError('Debe seleccionar un contrato');
      return;
    }
    if (!formData.idCuota) {
      setFormError('No se ha cargado una cuota pendiente');
      return;
    }
    if (!formData.idMetodoPago) {
      setFormError('Debe seleccionar un metodo de pago');
      return;
    }
    if (formData.monto <= 0) {
      setFormError('El monto debe ser mayor a 0');
      return;
    }

    try {
      setRegistrarLoading(true);
      await pagosApi.registrar(formData);
      setRegistrarDialog(false);
      setFormData(initialFormData);
      fetchPagos();
      setSnackbar({
        open: true,
        message: isOperador
          ? 'Solicitud de pago enviada para aprobacion'
          : 'Pago registrado y confirmado exitosamente',
        severity: 'success'
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al registrar el pago');
    } finally {
      setRegistrarLoading(false);
    }
  };

  const filteredPagos = useMemo(() => {
    let result = pagos;

    // Filter by Tab (Pago estado: 0=Anulado, 1=Confirmado, 2=Solicitud)
    if (tabValue === 1) result = result.filter(p => p.estado === ESTADOS_PAGO.SOLICITUD);
    else if (tabValue === 2) result = result.filter(p => p.estado === ESTADOS_PAGO.CONFIRMADO);
    else if (tabValue === 3) result = result.filter(p => p.estado === ESTADOS_PAGO.ANULADO);

    // Filter by Search Term
    if (searchTerm) {
      const lowerSrc = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.inquilino.toLowerCase().includes(lowerSrc) ||
        p.inmueble.toLowerCase().includes(lowerSrc) ||
        p.contratoId.toString().includes(lowerSrc)
      );
    }

    return result;
  }, [pagos, tabValue, searchTerm]);

  const contratoActivo = useMemo(() => contratosInquilino.find(c => c.id === selectedContratoId), [contratosInquilino, selectedContratoId]);
  const importeBase = cuotaPendiente?.precioCuota ?? detallePago?.cuota.precioCuota ?? 0;
  const moraCalculada = cuotaPendiente?.moraCalculada ?? detallePago?.cuota.moraCalculada ?? 0;
  const totalFinal = cuotaPendiente?.totalFinal ?? detallePago?.cuota.totalFinal ?? 0;
  const periodoCuota = cuotaPendiente?.periodo ?? detallePago?.cuota.periodo ?? '';
  const fechaVencimiento = cuotaPendiente?.fechaVencimiento ?? detallePago?.cuota.fechaVencimiento ?? '';

  const resetDialogForm = () => {
    setRegistrarDialog(false);
    setFormData(initialFormData);
    setSelectedInquilinoId('');
    setSelectedContratoId('');
    setContratosInquilino([]);
    setCuotaPendiente(null);
    setDetallePago(null);
    setFormError(null);
  };

  const resetActionDialog = () => {
    setActionDialog({ open: false, id: null, action: null });
    setMotivoRechazo('');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <PageHeader
          title="Gestion de Pagos"
          subtitle="Administra cobros, emite recibos y controla vencimientos."
          action={{
            label: "Registrar Pago",
            icon: <PaymentIcon />,
            onClick: openRegistrarDialog
          }}
        />

        {/* Boton de notificaciones */}
        <Box sx={{ position: 'relative' }}>
          <Tooltip title="Notificaciones">
            <IconButton
              onClick={() => setNotificacionesOpen(!notificacionesOpen)}
              sx={{
                bgcolor: notificacionesNoLeidas > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                '&:hover': { bgcolor: notificacionesNoLeidas > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)' }
              }}
            >
              <Badge badgeContent={notificacionesNoLeidas} color="error">
                <NotificationsIcon sx={{ color: notificacionesNoLeidas > 0 ? '#ef4444' : 'text.secondary' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Panel de notificaciones */}
          {notificacionesOpen && (
            <Card sx={{
              position: 'absolute',
              top: '100%',
              right: 0,
              mt: 1,
              width: 380,
              maxHeight: 450,
              overflow: 'hidden',
              zIndex: 1000,
              border: '1px solid rgba(255,255,255,0.1)',
              bgcolor: '#0A0A0A',
              borderRadius: 2,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notificaciones</Typography>
                {notificaciones.length > 0 && (
                  <Button size="small" onClick={marcarTodasComoLeidas} sx={{ fontSize: '0.75rem' }}>
                    Marcar todas como leidas
                  </Button>
                )}
              </Box>
              <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                {notificaciones.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <NotificationsIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No hay notificaciones</Typography>
                  </Box>
                ) : (
                  notificaciones.map(notif => (
                    <Box
                      key={notif.id}
                      onClick={() => marcarComoLeida(notif.id)}
                      sx={{
                        p: 2,
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        bgcolor: notif.leida ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                        display: 'flex',
                        gap: 2
                      }}
                    >
                      <Box sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: notif.tipo === 'rechazo' ? '#ef4444' : notif.tipo === 'aprobacion' ? '#10b981' : '#3b82f6',
                        mt: 0.5,
                        flexShrink: 0
                      }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{notif.titulo}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                          {notif.mensaje}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', opacity: 0.6 }}>
                          {new Date(notif.fecha).toLocaleString('es-AR')}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); eliminarNotificacion(notif.id); }}
                        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Box>
            </Card>
          )}
        </Box>
      </Box>

      <Card sx={{ mb: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', bgcolor: '#0A0A0A', boxShadow: 'none', borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <SearchInput
              placeholder="Buscar por inquilino, inmueble..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
            <Select
              size="small"
              value={tabValue}
              onChange={(e) => setTabValue(e.target.value as number)}
              sx={{ minWidth: 150, borderRadius: 2, bgcolor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', '& fieldset': { border: 'none' } }}
            >
              <MenuItem value={0}>Todos</MenuItem>
              <MenuItem value={1}>Solicitudes</MenuItem>
              <MenuItem value={2}>Confirmados</MenuItem>
              <MenuItem value={3}>Anulados</MenuItem>
            </Select>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : (
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>Inmueble</TableCell>
                    <TableCell>Inquilino</TableCell>
                    <TableCell align="center">Cuota</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="center" sx={{ pr: 4 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPagos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 10 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                          <PaymentIcon sx={{ fontSize: 48, mb: 1.5 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>No hay pagos</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>No se encontraron registros con estos filtros.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPagos.map((pago) => (
                      <TableRow key={pago.id} hover>
                        <TableCell sx={{ pl: 4 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{pago.inmueble || 'N/A'}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{pago.inquilino}</TableCell>
                        <TableCell align="center">
                          <Chip label={`Cuota ${pago.nroCuota}`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.primary">
                            {formatDate(pago.fechaVencimiento)}
                          </Typography>
                          {pago.fechaPago && (
                            <Typography variant="caption" color="text.secondary">
                              Pago: {formatDate(pago.fechaPago)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {formatCurrency(pago.monto)}
                          </Typography>
                          {pago.mora > 0 && (
                            <Typography variant="caption" color="error.main">
                              + {formatCurrency(pago.mora)} mora
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {pago.estado === 0 && <StatusChip label="Anulado" type="error" variant="outlined" />}
                          {pago.estado === 1 && <StatusChip label="Confirmado" type="success" />}
                          {pago.estado === 2 && <StatusChip label="Solicitud" type="warning" />}
                        </TableCell>
                        <TableCell align="center" sx={{ pr: 4 }}>
                          {pago.estado === 1 && (
                            <>
                              <Tooltip title="Descargar Recibo">
                                <IconButton
                                  color="primary"
                                  sx={{ mr: 1, bgcolor: 'rgba(67, 97, 238, 0.1)' }}
                                  onClick={() => handleDescargarRecibo(pago)}
                                >
                                  <ReceiptIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Anular Pago">
                                <IconButton
                                  color="error"
                                  sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)' }}
                                  onClick={() => setAnularDialog({ open: true, id: pago.id })}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {pago.estado === 2 && (canConfirmar || canRechazar) && (
                            <>
                              <Tooltip title="Confirmar Pago">
                                <IconButton
                                  color="success"
                                  sx={{ mr: 1, bgcolor: 'rgba(16, 185, 129, 0.1)' }}
                                  onClick={() => setActionDialog({ open: true, id: pago.id, action: 'confirmar' })}
                                >
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Rechazar Solicitud">
                                <IconButton
                                  color="error"
                                  sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)' }}
                                  onClick={() => setActionDialog({ open: true, id: pago.id, action: 'rechazar' })}
                                >
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Anular */}
      <Dialog
        open={anularDialog.open}
        onClose={() => !dialogLoading && setAnularDialog({ open: false, id: null })}
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Anular Pago</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estas seguro que deseas anular este pago? El estado volvera a pendiente y de ser necesario deberas emitir notas de credito correspondientes si fue facturado electronicamente.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setAnularDialog({ open: false, id: null })}
            color="inherit"
            disabled={dialogLoading}
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAnular}
            color="error"
            variant="contained"
            disabled={dialogLoading}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            {dialogLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar Anulacion'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* UPDATED: Dialog for Confirm/Reject with motivo */}
      <Dialog
        open={actionDialog.open}
        onClose={() => !dialogLoading && resetActionDialog()}
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', p: 1, minWidth: actionDialog.action === 'rechazar' ? 450 : 'auto' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {actionDialog.action === 'confirmar' ? 'Confirmar Pago' : 'Rechazar Solicitud'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: actionDialog.action === 'rechazar' ? 2 : 0 }}>
            {actionDialog.action === 'confirmar'
              ? '¿Estas seguro que deseas confirmar este pago? Una vez confirmado, el pago quedara registrado como efectivo y se podra generar el comprobante.'
              : '¿Estas seguro que deseas rechazar esta solicitud de pago? Por favor, indica el motivo del rechazo para notificar al operador.'}
          </DialogContentText>

          {/* Campo de motivo solo para rechazo */}
          {actionDialog.action === 'rechazar' && (
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={3}
              label="Motivo del rechazo"
              placeholder="Ej: Datos incorrectos, monto no coincide, documentacion faltante..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              sx={{ mt: 1 }}
              error={!motivoRechazo.trim() && dialogLoading}
              helperText={!motivoRechazo.trim() ? "El motivo es obligatorio" : ""}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={resetActionDialog}
            color="inherit"
            disabled={dialogLoading}
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={actionDialog.action === 'confirmar' ? handleConfirmar : handleRechazar}
            color={actionDialog.action === 'confirmar' ? 'success' : 'error'}
            variant="contained"
            disabled={dialogLoading || (actionDialog.action === 'rechazar' && !motivoRechazo.trim())}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            {dialogLoading ? <CircularProgress size={24} color="inherit" /> : (actionDialog.action === 'confirmar' ? 'Confirmar' : 'Rechazar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Registrar Pago */}
      <Dialog
        open={registrarDialog}
        onClose={() => !registrarLoading && resetDialogForm()}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          Registrar pago
          <IconButton onClick={() => !registrarLoading && resetDialogForm()} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 4 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formError}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 3, mb: 3, mt: 1 }}>
            <Box>
              <Typography sx={{ mb: 1, fontWeight: 700, fontSize: '0.875rem' }}>Inquilino</Typography>
              <Select
                fullWidth
                size="small"
                value={selectedInquilinoId}
                onChange={async (e) => {
                  const id = e.target.value as string;
                  setSelectedInquilinoId(id);
                  setSelectedContratoId('');
                  setCuotaPendiente(null);
                  setDetallePago(null);
                  setFormData(prev => ({ ...prev, idCuota: '', idMetodoPago: '', monto: 0, periodo: '' }));

                  if (!id) {
                    setContratosInquilino([]);
                    return;
                  }

                  try {
                    const data = await contratosApi.listarActivosPorInquilino(id);
                    setContratosInquilino(data);
                  } catch (err) {
                    console.error('Error al cargar contratos:', err);
                    setContratosInquilino([]);
                  }
                }}
              >
                {inquilinos.map(inq => (
                  <MenuItem key={inq.id} value={inq.id}>
                    {inq.nombreCompleto}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box>
              <Typography sx={{ mb: 1, fontWeight: 700, fontSize: '0.875rem' }}>Contrato</Typography>
              <Select
                fullWidth
                size="small"
                disabled={!selectedInquilinoId}
                value={selectedContratoId}
                onChange={async (e) => {
                  const cId = e.target.value as string;
                  setSelectedContratoId(cId);

                  if (!cId) {
                    setCuotaPendiente(null);
                    setDetallePago(null);
                    setFormData(prev => ({ ...prev, idCuota: '', idMetodoPago: '', monto: 0, periodo: '' }));
                    return;
                  }

                  try {
                    const [pendiente, calculado] = await Promise.all([
                      pagosApi.obtenerCuotaPendiente(cId),
                      pagosApi.calcular(cId)
                    ]);
                    setCuotaPendiente(pendiente);
                    setDetallePago(calculado);
                    setFormData(prev => ({
                      ...prev,
                      idCuota: pendiente.idCuota,
                      monto: pendiente.totalFinal,
                      periodo: pendiente.periodo
                    }));
                  } catch (err) {
                    console.error('Error al cargar datos de la cuota:', err);
                    setCuotaPendiente(null);
                    setDetallePago(null);
                  }
                }}
              >
                {!selectedInquilinoId ? (
                  <MenuItem value="" disabled>Seleccione un inquilino primero</MenuItem>
                ) : contratosInquilino.length === 0 ? (
                  <MenuItem value="" disabled>Sin contratos activos para este inquilino</MenuItem>
                ) : (
                  contratosInquilino.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.direccion || c.inmueble}
                    </MenuItem>
                  ))
                )}
              </Select>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 3, mb: 3 }}>
            <Box>
              <Typography sx={{ mb: 1, fontWeight: 700, fontSize: '0.875rem' }}>Metodo de pago</Typography>
              <Select
                fullWidth
                size="small"
                disabled={!detallePago}
                value={formData.idMetodoPago}
                onChange={(e) => setFormData(prev => ({ ...prev, idMetodoPago: e.target.value }))}
              >
                {!detallePago ? (
                  <MenuItem value="" disabled>Seleccione un contrato primero</MenuItem>
                ) : detallePago.metodosPago.length === 0 ? (
                  <MenuItem value="" disabled>Sin metodos de pago disponibles</MenuItem>
                ) : (
                  detallePago.metodosPago.map(mp => (
                    <MenuItem key={mp.id} value={mp.id}>
                      {mp.nombre}
                    </MenuItem>
                  ))
                )}
              </Select>
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Detalle de la cuota</Typography>
            <Typography sx={{ color: 'error.main', fontWeight: 800, fontSize: '0.875rem', mb: 3 }}>
              ATENCION! verificar los datos antes de registrar el pago, en caso contrario debera anular y rehacer el mismo
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">Inquilino</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{contratoActivo?.inquilino || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HomeWorkIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">Inmueble</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{contratoActivo?.direccion || contratoActivo?.inmueble || '-'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                  <EditIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">Nro. de cuota</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {cuotaPendiente?.nroCuota ?? detallePago?.cuota.nroCuota ?? '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">Vencimiento</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString('es-AR') : '-'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                  <CalendarIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">Periodo</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{periodoCuota || '-'}</Typography>
                </Box>
                <Chip
                  label={cuotaPendiente?.estado === 'Vencida' ? 'Vencida' : cuotaPendiente?.estado === 'Pagada' ? 'Pagada' : 'Pendiente'}
                  sx={{
                    bgcolor: cuotaPendiente?.estado === 'Vencida' ? '#ff4d4f' : cuotaPendiente?.estado === 'Pagada' ? '#10B981' : '#FFFF00',
                    color: '#000',
                    fontWeight: 800,
                    borderRadius: 1
                  }}
                  size="small"
                />
              </Box>

              {detallePago?.cuota.valorIndiceAplicado ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <MoneyIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>Valor indice aplicado</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{detallePago.cuota.valorIndiceAplicado.toLocaleString('es-AR')}</Typography>
                </Box>
              ) : null}

              {detallePago?.cuota.importeActualizado ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>Importe actualizado</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>$ {detallePago.cuota.importeActualizado.toLocaleString('es-AR')}</Typography>
                </Box>
              ) : null}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <MoneyIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>Precio cuota base</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>$ {importeBase.toLocaleString('es-AR')}</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>Adicional por mora</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>$ {moraCalculada.toLocaleString('es-AR')}</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <MoneyIcon fontSize="small" color="action" />
                <Typography variant="body2" sx={{ minWidth: 150, color: 'text.secondary' }}>Total a pagar</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>$ {totalFinal.toLocaleString('es-AR')}</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 2, display: 'flex', gap: 2 }}>
          <Button
            onClick={handleRegistrarPago}
            color="primary"
            variant="contained"
            fullWidth
            disabled={registrarLoading}
            sx={{ fontWeight: 600, py: 1.5, opacity: 0.8 }}
          >
            {registrarLoading ? <CircularProgress size={24} color="inherit" /> : (isOperador ? 'Solicitar aprobacion' : 'Registrar pago')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar with Alert for colors */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ open: false, message: '' })}
          severity={snackbar.severity || 'success'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
