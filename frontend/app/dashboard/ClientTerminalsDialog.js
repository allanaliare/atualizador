'use client';
import {Box,Button,Chip,Dialog,DialogActions,DialogContent,DialogTitle,Stack,Typography} from '@mui/material';
import {BugReport as BugReportIcon,ReceiptLong as ReceiptLongIcon} from '@mui/icons-material';

const fmt=value=>value?new Date(value.includes('T')?value:value.replace(' ','T')+'Z').toLocaleString('pt-BR'):'-';
const channelStyle=channel=>({test:{bgcolor:'#7b1fa2',color:'#fff'},beta:{bgcolor:'#1976d2',color:'#fff'},production:{bgcolor:'#2e7d32',color:'#fff'}}[channel]||{});

export default function ClientTerminalsDialog({client,terminals,close,showLog,showErrors}){
  const sorted=[...terminals].sort((a,b)=>
    String(a.product_code||'').localeCompare(String(b.product_code||''),'pt-BR',{sensitivity:'base'})||
    String(a.channel||'').localeCompare(String(b.channel||''),'pt-BR',{sensitivity:'base'})||
    String(a.current_version||'').localeCompare(String(b.current_version||''),'pt-BR',{numeric:true,sensitivity:'base'})
  );
  return <Dialog open={!!client} fullWidth maxWidth="lg" onClose={close}><DialogTitle>Terminais de {client?.name}</DialogTitle><DialogContent><Box sx={{overflowX:'auto'}}><Box sx={{minWidth:950}}><Box sx={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,p:1,fontWeight:700}}>{['Terminal','Computador','Produto','Canal','Versão','Último contato','Ações'].map(x=><Box key={x}>{x}</Box>)}</Box>{sorted.map(terminal=><Box key={terminal.id} sx={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,p:1.5,borderTop:'1px solid',borderColor:'divider',alignItems:'center'}}><Box>{terminal.name}</Box><Box>{terminal.computer_name||'-'}</Box><Box>{terminal.product_code}</Box><Box><Chip size="small" label={terminal.channel} sx={channelStyle(terminal.channel)}/></Box><Box>{terminal.current_version}</Box><Box>{fmt(terminal.last_seen_at)}</Box><Stack direction="row" spacing={1}><Button size="small" startIcon={<ReceiptLongIcon/>} onClick={()=>showLog(terminal)} aria-label="Ver log"/><Button size="small" startIcon={<BugReportIcon/>} onClick={()=>showErrors(terminal)} aria-label="Ver erros"/></Stack></Box>)}</Box></Box>{!terminals.length&&<Typography color="text.secondary" mt={2}>Nenhum terminal cadastrado.</Typography>}</DialogContent><DialogActions><Button onClick={close}>Fechar</Button></DialogActions></Dialog>;
}
