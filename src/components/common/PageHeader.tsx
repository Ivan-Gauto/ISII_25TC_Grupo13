import { Box, Typography, Button } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
  };
}

export const PageHeader = ({ title, subtitle, action }: PageHeaderProps) => (
  <Box sx={{ mb: 0 }}>
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
        {title}
      </Typography>
      {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
    </Box>
    {action && (
      <Button 
        variant="contained" 
        startIcon={action.icon}
        onClick={action.onClick}
        sx={{ 
          borderRadius: '6px', 
          px: 3, 
          py: 1, 
          bgcolor: '#fff', 
          color: '#000', 
          fontWeight: 600, 
          boxShadow: 'none', 
          '&:hover': { bgcolor: '#f0f0f0' } 
        }}
      >
        {action.label}
      </Button>
    )}
  </Box>
);
