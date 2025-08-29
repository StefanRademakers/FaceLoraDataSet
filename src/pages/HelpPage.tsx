import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

const HelpPage: React.FC = () => {
  const [page, setPage] = React.useState('welcome.html');
  const [content, setContent] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const helpFiles = [
    { key: 'setverdeling.html', title: 'Set verdeling' },
    { key: 'inspiratie.html', title: 'Training Guide Inspiratie' },
  ];

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`./help/${page}`)
      .then(r => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.text();
      })
      .then(html => {
        if (cancelled) return;
        // Extract body content + styles for nicer inline display
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const styles = Array.from(doc.head.querySelectorAll('style')).map(s => s.outerHTML).join('\n');
          const body = doc.body ? doc.body.innerHTML : html;
          setContent(styles + body);
        } catch {
          setContent(html);
        }
      })
      .catch(e => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [page]);

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Paper elevation={3} sx={{ width: 260, position: 'sticky', top: 0, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">Help Topics</Typography>
        </Box>
        <Divider />
        <List dense disablePadding>
          {helpFiles.map(file => (
            <ListItemButton
              key={file.key}
              selected={page === file.key}
              onClick={() => setPage(file.key)}
            >
              <ListItemText primary={file.title} primaryTypographyProps={{ fontSize: 14 }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          {error && <Typography color="error">Failed to load: {error}</Typography>}
          {!loading && !error && (
            <Box
              sx={{
                '& h1, & h2, & h3, & h4': { color: 'primary.main', mt: 3 },
                '& p': { lineHeight: 1.6 },
                '& ul': { pl: 3 },
                '& li': { mb: 0.5 },
                color: 'text.primary'
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default HelpPage;
