import { Box, Chip, Tooltip } from '@mui/material';

function OnlineStatus({ online }) {
  return (
    <Tooltip title={online ? 'Online' : 'Offline'}>
      <Box sx={{ display: 'flex', alignItems: 'center', mx: 0.5 }}>
        <Chip
          size="small"
          label={online ? 'Online' : 'Offline'}
          color={online ? 'success' : 'error'}
          variant={online ? 'outlined' : 'filled'}
          sx={{ height: 24 }}
        />
      </Box>
    </Tooltip>
  );
}

export default OnlineStatus;
