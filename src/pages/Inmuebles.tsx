import { useEffect, useState, useMemo } from 'react';
import {
    Box, Typography, Container, TextField,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar,
    Select, MenuItem, IconButton, Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { inmueblesApi } from '../api/inmuebles';
import type { Inmueble } from '../types/inmueble';
import { SearchInput } from '../components/common/SearchInput';
import { StatusChip } from '../components/common/StatusChip';

// Interfaz para el formulario de crear/editar inmueble
interface InmuebleFormData {
    id?: string;
    calle: string;
    altura: string;
    descripcion: string;
    disponibilidad: boolean;
    idTipoInmueble: string;
    // Propietario - por ahora usaremos campos de texto hasta que tengas el endpoint
    idPersonaPropietario: string;
    idRolClientePropietario: string;
}

const initialFormData: InmuebleFormData = {
    calle: '',
    altura: '',
    descripcion: '',
    disponibilidad: true,
    idTipoInmueble: '',
    idPersonaPropietario: '',
    idRolClientePropietario: ''
};

// Mock de tipos de inmueble - reemplazar cuando tengas el endpoint
const TIPOS_INMUEBLE_MOCK = [
    { id: '1', nombre: 'Departamento' },
    { id: '2', nombre: 'Casa' },
    { id: '3', nombre: 'Local Comercial' },
    { id: '4', nombre: 'Oficina' },
    { id: '5', nombre: 'Terreno' },
];

export default function InmueblesPage() {
    const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtering state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDisponibilidad, setFilterDisponibilidad] = useState<number>(0); // 0=Todos, 1=Disponibles, 2=Ocupados

    // Dialog state for creating/editing
    const [formDialog, setFormDialog] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState<InmuebleFormData>(initialFormData);
    const [formError, setFormError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Dialog state for confirming deletion
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Success snackbar
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

    const fetchInmuebles = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await inmueblesApi.listarInmuebles();
            setInmuebles(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar inmuebles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInmuebles();
    }, []);

    const openFormDialog = (inmueble?: Inmueble) => {
        if (inmueble) {
            // Modo edición
            setIsEditing(true);
            setFormData({
                id: inmueble.id,
                calle: inmueble.direccion || '',
                altura: '',
                descripcion: inmueble.descripcion || '',
                disponibilidad: inmueble.disponibilidad,
                idTipoInmueble: inmueble.idTipoInmueble || '',
                idPersonaPropietario: inmueble.idPersonaPropietario || '',
                idRolClientePropietario: inmueble.idRolClientePropietario || ''
            });
        } else {
            // Modo creación
            setIsEditing(false);
            setFormData(initialFormData);
        }
        setFormError(null);
        setFormDialog(true);
    };

    const handleFormChange = (field: keyof InmuebleFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setFormError(null);

        // Validaciones básicas
        if (!formData.calle.trim()) {
            setFormError('La calle es obligatoria');
            return;
        }
        if (!formData.altura.trim()) {
            setFormError('La altura es obligatoria');
            return;
        }
        if (!formData.descripcion.trim()) {
            setFormError('La descripción es obligatoria');
            return;
        }

        try {
            setFormLoading(true);

            // Construir el objeto para enviar al backend
            const inmuebleData: Inmueble = {
                id: formData.id,
                idDireccion: '', // Se creará en el backend
                descripcion: formData.descripcion,
                disponibilidad: formData.disponibilidad,
                idTipoInmueble: formData.idTipoInmueble,
                idPersonaPropietario: formData.idPersonaPropietario,
                idRolClientePropietario: formData.idRolClientePropietario,
                // Campos adicionales para la dirección
                direccion: `${formData.calle} ${formData.altura}`.trim()
            };

            if (isEditing && formData.id) {
                await inmueblesApi.actualizar(inmuebleData);
                setSnackbar({ open: true, message: 'Inmueble actualizado exitosamente' });
            } else {
                await inmueblesApi.registrar(inmuebleData);
                setSnackbar({ open: true, message: 'Inmueble creado exitosamente' });
            }

            setFormDialog(false);
            setFormData(initialFormData);
            fetchInmuebles();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Error al guardar inmueble');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog.id) return;
        try {
            setDeleteLoading(true);
            await inmueblesApi.eliminar(deleteDialog.id);
            setDeleteDialog({ open: false, id: null });
            fetchInmuebles();
            setSnackbar({ open: true, message: 'Inmueble eliminado exitosamente' });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error al eliminar inmueble');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Métricas
    const totalInmuebles = inmuebles.length;
    const disponibles = inmuebles.filter(i => i.disponibilidad).length;
    const ocupados = inmuebles.filter(i => !i.disponibilidad).length;
    const inactivos = inmuebles.filter(i => i.estado === 'Inactivo').length;

    // Filtrado
    const filteredInmuebles = useMemo(() => {
        let result = inmuebles;

        // Filtrar por disponibilidad
        if (filterDisponibilidad === 1) {
            result = result.filter(i => i.disponibilidad);
        } else if (filterDisponibilidad === 2) {
            result = result.filter(i => !i.disponibilidad);
        }

        // Filtrar por término de búsqueda
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(i =>
                i.direccion?.toLowerCase().includes(lowerSearch) ||
                i.descripcion?.toLowerCase().includes(lowerSearch) ||
                i.propietarioNombreCompleto?.toLowerCase().includes(lowerSearch)
            );
        }

        return result;
    }, [inmuebles, filterDisponibilidad, searchTerm]);

    return (
        <Container maxWidth="xl" sx={{ py: 6 }}>
            {/* Header Minimalista */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-1.5px' }}>
                        Inmuebles
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
                        Gestiona las propiedades disponibles para alquiler.
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openFormDialog()}
                    sx={{
                        bgcolor: '#fff',
                        color: '#000',
                        px: 4,
                        py: 1.5,
                        borderRadius: '12px',
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        '&:hover': { bgcolor: '#f0f0f0', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' },
                        boxShadow: 'none'
                    }}
                >
                    Nuevo Inmueble
                </Button>
            </Box>

            {/* Barra de Métricas Sobria */}
            <Box sx={{
                display: 'flex',
                gap: 6,
                mb: 6,
                pb: 4,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>TOTAL</Typography>
                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 300 }}>{totalInmuebles}</Typography>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>DISPONIBLES</Typography>
                    <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 300 }}>{disponibles}</Typography>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>OCUPADOS</Typography>
                    <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 300 }}>{ocupados}</Typography>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>INACTIVOS</Typography>
                    <Typography variant="h4" sx={{ color: 'rgba(255,255,255,0.15)', fontWeight: 300 }}>{inactivos}</Typography>
                </Box>
            </Box>

            {/* Controles y Tabla */}
            <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    <Box sx={{ flex: 1 }}>
                        <SearchInput
                            placeholder="Buscar por dirección, descripción o propietario..."
                            value={searchTerm}
                            onChange={setSearchTerm}
                        />
                    </Box>
                    <Select
                        size="small"
                        value={filterDisponibilidad}
                        onChange={(e) => setFilterDisponibilidad(e.target.value as number)}
                        sx={{
                            minWidth: 180,
                            borderRadius: '12px',
                            color: '#fff',
                            bgcolor: 'rgba(255,255,255,0.03)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        <MenuItem value={0}>Todos</MenuItem>
                        <MenuItem value={1}>Disponibles</MenuItem>
                        <MenuItem value={2}>Ocupados</MenuItem>
                    </Select>
                </Box>

                <Box sx={{ bgcolor: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
                    ) : error ? (
                        <Box sx={{ p: 4 }}>
                            <Alert severity="error">{error}</Alert>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                                    <TableRow>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600, py: 2.5, pl: 4 }}>DIRECCIÓN</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>DESCRIPCIÓN</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>PROPIETARIO</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>DISPONIBILIDAD</TableCell>
                                        <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>ACCIONES</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredInmuebles.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} sx={{ textAlign: 'center', py: 10 }}>
                                                <Typography sx={{ color: 'rgba(255,255,255,0.2)' }}>No hay inmuebles registrados</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInmuebles.map((inmueble) => (
                                            <TableRow key={inmueble.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                <TableCell sx={{ color: '#fff', fontWeight: 500, py: 3, pl: 4 }}>
                                                    {inmueble.direccion || 'Sin dirección'}
                                                </TableCell>
                                                <TableCell sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                                    {inmueble.descripcion || '-'}
                                                </TableCell>
                                                <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                                                    {inmueble.propietarioNombreCompleto || 'Sin propietario'}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusChip
                                                        label={inmueble.disponibilidad ? 'Disponible' : 'Ocupado'}
                                                        type={inmueble.disponibilidad ? 'success' : 'warning'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Editar">
                                                        <IconButton
                                                            onClick={() => openFormDialog(inmueble)}
                                                            sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Eliminar">
                                                        <IconButton
                                                            onClick={() => setDeleteDialog({ open: true, id: inmueble.id! })}
                                                            sx={{ color: 'rgba(244, 67, 54, 0.5)', '&:hover': { color: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.1)' } }}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Box>

            {/* Dialog for Creating/Editing Inmueble */}
            <Dialog
                open={formDialog}
                onClose={() => !formLoading && setFormDialog(false)}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper' } } }}
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
                    {isEditing ? 'Editar Inmueble' : 'Nuevo Inmueble'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        {formError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {formError}
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {/* Dirección */}
                            <Box sx={{ flex: '1 1 60%', minWidth: 200 }}>
                                <TextField
                                    label="Calle"
                                    fullWidth
                                    value={formData.calle}
                                    onChange={(e) => handleFormChange('calle', e.target.value)}
                                    placeholder="Ej: Av. Corrientes"
                                />
                            </Box>
                            <Box sx={{ flex: '1 1 35%', minWidth: 120 }}>
                                <TextField
                                    label="Altura"
                                    fullWidth
                                    value={formData.altura}
                                    onChange={(e) => handleFormChange('altura', e.target.value)}
                                    placeholder="Ej: 1234"
                                />
                            </Box>

                            {/* Descripción */}
                            <Box sx={{ flex: '1 1 100%' }}>
                                <TextField
                                    label="Descripción"
                                    fullWidth
                                    multiline
                                    rows={2}
                                    value={formData.descripcion}
                                    onChange={(e) => handleFormChange('descripcion', e.target.value)}
                                    placeholder="Ej: Departamento 3 ambientes con balcón"
                                />
                            </Box>

                            {/* Tipo de Inmueble */}
                            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                                <TextField
                                    select
                                    label="Tipo de Inmueble"
                                    fullWidth
                                    value={formData.idTipoInmueble}
                                    onChange={(e) => handleFormChange('idTipoInmueble', e.target.value)}
                                >
                                    <MenuItem value="" disabled>Seleccionar tipo</MenuItem>
                                    {TIPOS_INMUEBLE_MOCK.map((tipo) => (
                                        <MenuItem key={tipo.id} value={tipo.id}>
                                            {tipo.nombre}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* Disponibilidad */}
                            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                                <TextField
                                    select
                                    label="Disponibilidad"
                                    fullWidth
                                    value={formData.disponibilidad ? 'true' : 'false'}
                                    onChange={(e) => handleFormChange('disponibilidad', e.target.value === 'true')}
                                >
                                    <MenuItem value="true">Disponible</MenuItem>
                                    <MenuItem value="false">Ocupado</MenuItem>
                                </TextField>
                            </Box>

                            {/* Nota sobre propietario */}
                            <Box sx={{ flex: '1 1 100%', p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Nota: La selección de propietario estará disponible cuando se implemente el módulo de propietarios.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button
                        onClick={() => {
                            setFormDialog(false);
                            setFormData(initialFormData);
                            setFormError(null);
                        }}
                        color="inherit"
                        disabled={formLoading}
                        sx={{ fontWeight: 600 }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        color="primary"
                        variant="contained"
                        disabled={formLoading}
                        sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
                    >
                        {formLoading ? <CircularProgress size={24} color="inherit" /> : (isEditing ? 'Guardar Cambios' : 'Crear Inmueble')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog for Delete */}
            <Dialog
                open={deleteDialog.open}
                onClose={() => !deleteLoading && setDeleteDialog({ open: false, id: null })}
                slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', p: 1 } } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Eliminar Inmueble</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro que deseas eliminar este inmueble? Esta acción marcará el inmueble como inactivo en el sistema.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button
                        onClick={() => setDeleteDialog({ open: false, id: null })}
                        color="inherit"
                        disabled={deleteLoading}
                        sx={{ fontWeight: 600 }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDelete}
                        color="error"
                        variant="contained"
                        disabled={deleteLoading}
                        sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
                    >
                        {deleteLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar Eliminación'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ open: false, message: '' })}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Container>
    );
}
