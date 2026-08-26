# Portal de documentos para clientes e contabilidades

## 1. Objetivo

Adicionar à Central de Atualização um módulo privado para receber, armazenar e
disponibilizar arquivos por cliente, inicialmente:

- notas fiscais de entrada;
- backups do sistema;
- outros documentos que venham a ser definidos.

O módulo terá dois públicos externos:

- **cliente:** acessa somente os documentos da própria empresa;
- **contabilidade:** acessa os clientes vinculados manualmente por um
  administrador da Central.

O certificado digital identifica quem está entrando. A autorização continua
sendo responsabilidade da Central: possuir um certificado válido não concede
acesso automático a documentos.

## 2. Escopo inicial recomendado

A primeira versão deve entregar:

1. Upload de arquivos associado a um cliente.
2. Separação entre notas de entrada e backups.
3. Autenticação do portal com certificado digital.
4. Acesso do cliente aos próprios arquivos.
5. Solicitação de cadastro de contabilidade desconhecida.
6. Aprovação manual da contabilidade pelo administrador.
7. Vínculo manual entre contabilidade e clientes.
8. Consulta e download somente com autorização.
9. Auditoria de login, consulta e download.
10. Política básica de tamanho, cota e retenção.

Não faz parte da primeira versão:

- compartilhamento público por link;
- edição de arquivos enviados;
- liberação automática de clientes para uma contabilidade;
- sincronização com órgãos fiscais;
- restauração automática de backups pelo portal.

## 3. Perfis e regras de acesso

### 3.1 Administrador interno

Pode:

- consultar todos os clientes, contabilidades e arquivos;
- aprovar, rejeitar, bloquear e reativar contabilidades;
- vincular e desvincular clientes de uma contabilidade;
- definir permissões do vínculo;
- consultar a auditoria;
- configurar cotas e retenção;
- remover arquivos conforme a política definida.

### 3.2 Cliente

É identificado pelo CNPJ validado no certificado e correspondente ao documento
do cliente já cadastrado na Central.

Pode:

- acessar somente a própria empresa;
- listar e baixar os próprios documentos;
- consultar informações básicas dos arquivos;
- visualizar as contabilidades autorizadas, caso essa função seja habilitada.

Não pode trocar o cliente ativo nem consultar documentos de outro CNPJ.

### 3.3 Contabilidade

É uma organização cadastrada e aprovada manualmente. Pode ter vários usuários ou
certificados vinculados no futuro.

Pode:

- selecionar entre os clientes explicitamente vinculados;
- listar e baixar somente as categorias autorizadas em cada vínculo;
- consultar o histórico dos próprios downloads.

Uma contabilidade aprovada, mas sem clientes vinculados, consegue entrar no
portal, porém não visualiza documentos.

## 4. Fluxo de autenticação com certificado

### 4.1 Separação dos endereços

O navegador negocia o certificado durante a conexão TLS, antes de fazer a
requisição HTTP. Por isso, o botão de acesso deve redirecionar para um endereço
que exija certificado, em vez de tentar ativá-lo em uma rota do mesmo domínio já
aberto.

Exemplo:

- `https://central.exemplo.com/cliente/portal/`: página inicial e portal;
- `https://cert.central.exemplo.com/entrar`: autenticação por certificado.

Fluxo:

1. O usuário abre `/cliente/portal/`.
2. Clica em **Entrar com certificado digital**.
3. O portal cria um `state` aleatório, de uso único e curta validade.
4. O navegador é redirecionado para `cert.central.exemplo.com/entrar`.
5. O Nginx solicita e valida o certificado do cliente.
6. O backend valida os dados encaminhados pelo Nginx e identifica CPF/CNPJ.
7. O backend cria um código de retorno de uso único.
8. O navegador retorna ao portal com esse código.
9. O portal troca o código por uma sessão segura.

O código de retorno nunca deve conter o certificado, CPF, CNPJ ou permissões em
texto aberto na URL.

### 4.2 Validação obrigatória

Antes de criar uma sessão, validar:

- resultado da validação TLS feita pelo Nginx;
- cadeia confiável do certificado;
- período de validade;
- revogação, conforme a infraestrutura adotada;
- finalidade do certificado;
- CPF ou CNPJ obtido de campo apropriado do certificado;
- `state` existente, não utilizado, não expirado e pertencente ao navegador que
  iniciou o fluxo.

Os cabeçalhos de certificado só são confiáveis quando a requisição veio do
Nginx controlado pela aplicação. A porta do Node não deve ficar exposta à
internet. O Nginx deve substituir, e não apenas acrescentar, os cabeçalhos
internos usados nessa comunicação.

### 4.3 Identificação não é autorização

O certificado comprova uma identidade. Depois disso, o backend determina o que
ela pode acessar:

1. Normaliza o CPF/CNPJ para somente números.
2. Procura uma identidade ativa já cadastrada.
3. Se o CNPJ corresponder a um cliente ativo, cria uma sessão restrita àquele
   cliente.
4. Caso corresponda a uma contabilidade aprovada, carrega apenas os vínculos
   ativos.
5. Caso seja uma contabilidade pendente ou bloqueada, não libera arquivos.
6. Caso seja uma identidade desconhecida, permite apenas solicitar cadastro.

Não se deve concluir definitivamente que todo CNPJ desconhecido é uma
contabilidade. O usuário solicita o cadastro como contabilidade, e o
administrador confirma essa informação antes da aprovação.

## 5. Cadastro da contabilidade

### 5.1 Primeiro acesso

Quando um CNPJ validado não existir como cliente ou contabilidade:

1. Exibir a opção **Solicitar cadastro de contabilidade**.
2. Preencher automaticamente CNPJ e informações disponíveis no certificado.
3. Bloquear a edição do CNPJ validado.
4. Solicitar nome, razão social, e-mail, telefone e responsável.
5. Exigir aceite dos termos e da política aplicável.
6. Criar a solicitação com status `pending`.
7. Registrar certificado, data, IP e dados enviados na auditoria.
8. Informar que nenhum documento será liberado até a aprovação.

Solicitações repetidas do mesmo CNPJ devem atualizar ou complementar a
solicitação pendente, sem criar contabilidades duplicadas.

### 5.2 Aprovação administrativa

No painel interno, o administrador visualiza:

- CNPJ e dados confirmados pelo certificado;
- razão social e nome informados;
- contato e responsável;
- número de série, emissor e validade do certificado;
- data e IP da solicitação;
- possíveis clientes com nomes ou documentos semelhantes;
- histórico de aprovação, rejeição ou bloqueio.

O administrador pode:

- aprovar;
- rejeitar com justificativa;
- solicitar correção;
- bloquear uma contabilidade já aprovada.

### 5.3 Vínculo com clientes

Após a aprovação, o administrador seleciona os clientes autorizados e define,
por vínculo:

- acesso a notas de entrada;
- acesso a backups;
- acesso a outras categorias;
- data inicial e final opcional;
- situação ativa ou bloqueada.

O vínculo é muitos para muitos: uma contabilidade pode atender vários clientes,
e um cliente pode possuir mais de uma contabilidade autorizada.

Desvincular ou bloquear deve impedir novas consultas e downloads imediatamente,
inclusive em sessões já abertas. A autorização deve ser verificada a cada
requisição de arquivo, e não apenas durante o login.

## 6. Suporte futuro a e-CPF

O primeiro escopo pode trabalhar com e-CNPJ, mas o modelo deve aceitar e-CPF.
Funcionários e responsáveis podem usar um certificado pessoal sem ter acesso ao
certificado da organização.

Nesse caso:

1. A pessoa entra com e-CPF.
2. Solicita vínculo com uma contabilidade aprovada.
3. Um administrador da Central ou responsável autorizado aprova o vínculo.
4. A pessoa herda somente as permissões concedidas à contabilidade e ao seu
   próprio usuário.

Nunca liberar uma contabilidade apenas porque o e-CPF pertence a um contador. O
vínculo com a organização e os clientes continua explícito.

## 7. Armazenamento de documentos

### 7.1 Separação física

Arquivos de clientes não devem ser colocados na pasta pública `/downloads`,
usada pelos pacotes de atualização.

Estrutura inicial sugerida:

```text
storage/
  clients/
    <client-id>/
      incoming-invoices/
        2026/
          08/
            <file-id>.xml
      backups/
        2026/
          08/
            <file-id>.zip
      other/
        2026/
          08/
            <file-id>.bin
  temporary/
  quarantine/
```

O nome físico deve usar um identificador gerado pelo servidor. O nome original
fica somente nos metadados e no cabeçalho do download. Isso evita colisões e
caminhos maliciosos.

Em produção, o diretório pode ser substituído por armazenamento compatível com
S3 sem alterar o modelo de autorização.

### 7.2 Metadados obrigatórios

Para cada arquivo, armazenar:

- ID interno;
- cliente proprietário;
- terminal ou sistema que enviou;
- categoria;
- nome original;
- nome/caminho físico interno;
- extensão e tipo de conteúdo detectado;
- tamanho em bytes;
- SHA-256;
- data de referência do documento;
- data de envio;
- identidade responsável pelo envio, quando houver;
- status de processamento;
- data prevista para expiração;
- motivo e data de eventual remoção.

O banco guarda metadados; o conteúdo binário permanece no armazenamento de
arquivos.

### 7.3 Categorias iniciais

Valores iniciais sugeridos:

- `incoming_invoice`: nota fiscal de entrada;
- `system_backup`: backup do sistema;
- `other`: outros documentos autorizados.

Evitar usar texto livre como categoria para facilitar permissões, filtros,
retenção e auditoria.

### 7.4 Upload

O upload deve:

1. Autenticar cliente, terminal ou usuário.
2. Verificar se pode enviar para o cliente informado.
3. Gravar primeiro em `temporary`.
4. Limitar tamanho e quantidade.
5. Validar nome, extensão e conteúdo mínimo esperado.
6. Calcular SHA-256 durante o recebimento.
7. Recusar caminhos, executáveis ou formatos não permitidos para a categoria.
8. Detectar duplicidade conforme cliente, categoria, SHA-256 e período.
9. Mover atomicamente para o destino definitivo.
10. Criar os metadados somente de forma consistente com o arquivo final.

Se houver falha, remover o temporário e não deixar um registro disponível para
download.

Para backups grandes, implementar upload em partes com retomada. O servidor não
deve carregar o backup inteiro em memória.

### 7.5 Download

Todo download deve passar por uma rota autenticada. A rota deve:

1. Localizar o arquivo por ID, nunca por caminho enviado pelo usuário.
2. Confirmar que o arquivo está ativo.
3. Verificar novamente o acesso ao cliente e à categoria.
4. Registrar a tentativa na auditoria.
5. Entregar o arquivo sem revelar o caminho físico.

O Nginx pode entregar o conteúdo depois da autorização usando redirecionamento
interno, mas o diretório físico não deve possuir uma rota pública direta.

## 8. Modelo de dados sugerido

Os nomes podem ser adaptados ao padrão definitivo do projeto.

### `portal_identity`

| Campo | Finalidade |
|---|---|
| `id` | Identificador interno |
| `identity_type` | `cnpj` ou `cpf` |
| `document` | CPF/CNPJ normalizado e único por contexto |
| `display_name` | Nome apresentado ao usuário |
| `active` | Identidade habilitada |
| `created_at` | Data de criação |
| `last_login_at` | Último login válido |

### `certificate_identity`

| Campo | Finalidade |
|---|---|
| `id` | Identificador interno |
| `portal_identity_id` | Identidade proprietária |
| `serial_number` | Número de série normalizado |
| `issuer` | Emissor |
| `subject` | Identificação do titular |
| `fingerprint_sha256` | Impressão digital do certificado |
| `valid_from` / `valid_to` | Período de validade |
| `revoked_at` | Bloqueio local, quando aplicável |
| `last_used_at` | Último uso |

Não armazenar a chave privada do usuário.

### `accounting_office`

| Campo | Finalidade |
|---|---|
| `id` | Identificador interno |
| `portal_identity_id` | Identidade principal |
| `cnpj` | CNPJ normalizado |
| `legal_name` | Razão social |
| `trade_name` | Nome fantasia |
| `email` / `phone` | Contato |
| `responsible_name` | Responsável informado |
| `status` | `pending`, `approved`, `rejected` ou `blocked` |
| `reviewed_by` | Administrador responsável |
| `reviewed_at` | Data da decisão |
| `review_notes` | Justificativa ou observação |

### `accounting_client_access`

| Campo | Finalidade |
|---|---|
| `accounting_office_id` | Contabilidade |
| `client_id` | Cliente autorizado |
| `can_view_invoices` | Acesso a notas |
| `can_view_backups` | Acesso a backups |
| `active` | Vínculo ativo |
| `valid_from` / `valid_until` | Vigência opcional |
| `created_by` / `created_at` | Responsável e data |
| `revoked_by` / `revoked_at` | Revogação |

Criar unicidade para o par contabilidade/cliente e índices pelos dois lados.

### `client_file`

| Campo | Finalidade |
|---|---|
| `id` | Identificador não previsível |
| `client_id` | Proprietário |
| `terminal_id` | Origem opcional |
| `category` | Categoria controlada |
| `original_name` | Nome para exibição/download |
| `storage_key` | Caminho interno ou chave do objeto |
| `content_type` | Tipo detectado |
| `size_bytes` | Tamanho |
| `sha256` | Integridade e duplicidade |
| `reference_date` | Competência ou referência |
| `status` | `uploading`, `available`, `quarantined`, `deleted` |
| `uploaded_at` | Data de envio |
| `expires_at` | Retenção |
| `deleted_at` | Exclusão lógica |

### `portal_audit_event`

Registrar, no mínimo:

- identidade e sessão;
- contabilidade, quando houver;
- cliente afetado;
- arquivo, quando houver;
- ação;
- resultado permitido ou negado;
- IP e identificação do navegador;
- data em UTC;
- detalhes seguros, sem tokens, senhas ou conteúdo do documento.

## 9. API sugerida

### Autenticação

```text
POST /api/v1/portal/auth/start
GET  /api/v1/portal/auth/certificate
POST /api/v1/portal/auth/exchange
POST /api/v1/portal/auth/logout
GET  /api/v1/portal/me
```

### Cadastro da contabilidade

```text
POST /api/v1/portal/accounting-registration
GET  /api/v1/portal/accounting-registration/status
```

### Portal

```text
GET /api/v1/portal/clients
GET /api/v1/portal/clients/:clientId/files
GET /api/v1/portal/files/:fileId
GET /api/v1/portal/files/:fileId/download
GET /api/v1/portal/audit/downloads
```

Para cliente direto, o backend ignora qualquer tentativa de usar outro
`clientId`. Para contabilidade, valida o vínculo e a categoria a cada chamada.

### Administração

```text
GET   /api/v1/admin/accounting-offices
GET   /api/v1/admin/accounting-offices/:id
PATCH /api/v1/admin/accounting-offices/:id/status
GET   /api/v1/admin/accounting-offices/:id/clients
POST  /api/v1/admin/accounting-offices/:id/clients
PATCH /api/v1/admin/accounting-offices/:id/clients/:clientId
DELETE /api/v1/admin/accounting-offices/:id/clients/:clientId
GET   /api/v1/admin/client-files
GET   /api/v1/admin/portal-audit
```

### Envio automático

```text
POST /api/v1/client-files/uploads
POST /api/v1/client-files/uploads/:uploadId/parts
POST /api/v1/client-files/uploads/:uploadId/complete
DELETE /api/v1/client-files/uploads/:uploadId
```

Para arquivos pequenos, a primeira versão pode oferecer um `POST` multipart
único. Backups devem evoluir para envio em partes.

## 10. Autenticação dos sistemas que enviam arquivos

A chave global `INSTALLATION_KEY` atual não deve autorizar armazenamento por
cliente, pois uma instalação poderia declarar outro `clientId`.

Alternativas, em ordem recomendada:

1. Credencial individual por cliente e terminal, emitida após registro seguro.
2. Certificado de dispositivo ou assinatura assimétrica por instalação.
3. Token temporário emitido por uma credencial individual.

Cada credencial deve conter ou resolver internamente:

- cliente permitido;
- terminal permitido;
- categorias aceitas;
- situação ativa;
- data de expiração ou rotação.

O cliente nunca informa livremente qual empresa será proprietária do arquivo; o
backend deriva essa informação da credencial validada.

## 11. Sessões e proteção do portal

- Usar cookie `HttpOnly`, `Secure` e `SameSite` adequado ao fluxo entre os
  domínios.
- Manter sessão com expiração curta e renovação controlada.
- Revogar sessões após bloqueio da identidade ou contabilidade.
- Proteger operações mutáveis contra CSRF.
- Aplicar limitação de tentativas e de requisições.
- Não armazenar o certificado completo no navegador após o login.
- Não colocar CPF, CNPJ, tokens ou permissões na URL.
- Exibir mensagens genéricas ao negar acesso, mantendo detalhes na auditoria.

## 12. Segurança dos arquivos

- Manter o armazenamento fora da raiz pública do Nginx.
- Usar criptografia de disco ou criptografia por objeto em produção.
- Separar chaves e arquivos.
- Aplicar princípio de menor privilégio ao usuário do backend.
- Bloquear caminhos relativos, absolutos e nomes maliciosos.
- Validar formato real, não apenas extensão.
- Considerar verificação antimalware antes de disponibilizar uploads externos.
- Fazer backup do banco de metadados e do armazenamento de forma coordenada.
- Testar restauração periodicamente.
- Não registrar conteúdo de notas ou backups nos logs.

Notas e backups podem conter informações sensíveis. A política de retenção,
acesso e exclusão deve ser definida com os responsáveis jurídicos e contábeis da
operação antes da entrada em produção.

## 13. Cotas e retenção

Definir por cliente e categoria:

- tamanho máximo por arquivo;
- quantidade máxima diária;
- espaço total contratado;
- prazo de retenção;
- comportamento ao atingir a cota;
- janela de exclusão e recuperação.

Uma rotina agendada deve:

1. localizar arquivos expirados;
2. marcar a exclusão;
3. registrar auditoria;
4. remover o conteúdo conforme a política;
5. manter ou anonimizar os metadados necessários.

Não remover automaticamente arquivos fiscais ou backups sem uma política
formalmente definida.

## 14. Telas necessárias

### Portal público

- Página inicial `/cliente/portal/`.
- Botão **Entrar com certificado digital**.
- Solicitação de cadastro de contabilidade.
- Tela de cadastro pendente, rejeitado ou bloqueado.

### Cliente

- Resumo da empresa.
- Filtros por categoria, período e nome.
- Lista e download dos documentos.
- Histórico de downloads.

### Contabilidade

- Seletor de cliente autorizado.
- Indicação clara do cliente atualmente selecionado.
- Mesmos filtros e downloads, respeitando as permissões do vínculo.
- Tela sem conteúdo quando ainda não houver clientes vinculados.

### Administração

- Lista de solicitações pendentes.
- Revisão e aprovação da contabilidade.
- Gestão de vínculos e permissões.
- Arquivos por cliente.
- Uso de armazenamento e cotas.
- Auditoria e tentativas negadas.

## 15. Auditoria mínima

Registrar ações como:

- `certificate_login_succeeded`;
- `certificate_login_failed`;
- `accounting_registration_requested`;
- `accounting_registration_approved`;
- `accounting_registration_rejected`;
- `accounting_office_blocked`;
- `accounting_client_link_created`;
- `accounting_client_link_revoked`;
- `client_file_uploaded`;
- `client_file_downloaded`;
- `client_file_download_denied`;
- `client_file_deleted`.

A auditoria não deve ser alterável pelos usuários do portal e deve possuir
filtros por período, identidade, contabilidade, cliente, arquivo e ação.

## 16. Ordem recomendada de implementação

### Fase 1 — Base de documentos

1. Criar tabelas de arquivos e auditoria.
2. Criar armazenamento privado.
3. Implementar upload autenticado por cliente/terminal.
4. Implementar listagem e download administrativo.
5. Definir limites, duplicidade e retenção inicial.

### Fase 2 — Identidade por certificado

1. Configurar domínio de autenticação por certificado.
2. Validar cadeia e extrair CPF/CNPJ.
3. Implementar `state`, código de retorno e sessão.
4. Implementar identidades e certificados conhecidos.
5. Registrar tentativas na auditoria.

### Fase 3 — Portal do cliente

1. Associar CNPJ validado ao cliente existente.
2. Criar página de documentos da própria empresa.
3. Implementar filtros e downloads autorizados.
4. Implementar histórico de downloads.

### Fase 4 — Contabilidade

1. Criar solicitação de cadastro.
2. Criar revisão e aprovação administrativa.
3. Criar vínculos contabilidade/cliente.
4. Aplicar permissões por categoria.
5. Criar seletor de cliente no portal.

### Fase 5 — Operação em escala

1. Upload em partes e retomada para backups.
2. Cotas por cliente.
3. Retenção automática.
4. Armazenamento compatível com S3, se necessário.
5. Antimalware, monitoramento, alertas e testes de restauração.
6. Suporte a e-CPF e múltiplos usuários por contabilidade.

## 17. Critérios mínimos de aceite

- Um cliente nunca acessa arquivos de outro cliente.
- Uma contabilidade desconhecida não acessa documentos.
- Uma contabilidade pendente ou bloqueada não acessa documentos.
- Uma contabilidade aprovada acessa somente clientes vinculados.
- Permissões de nota e backup são respeitadas separadamente.
- Desvincular um cliente interrompe o acesso imediatamente.
- O backend não confia em `clientId` enviado sem conferir a identidade.
- Arquivos privados não possuem URL pública direta.
- Todo download permitido ou negado aparece na auditoria.
- Certificado inválido, vencido, revogado ou não confiável não cria sessão.
- CNPJ é normalizado e não gera cadastros duplicados.
- Upload incompleto não aparece como disponível.
- SHA-256 e tamanho são confirmados antes da publicação do arquivo.
- Backups grandes não precisam ser carregados integralmente na memória.
- Tokens, certificados, documentos e conteúdo dos arquivos não aparecem em logs.
- A restauração do armazenamento e dos metadados é testada antes da produção.

## 18. Decisões pendentes antes do desenvolvimento

1. Quais formatos de nota serão aceitos: XML, PDF, ZIP ou combinação.
2. Quem enviará as notas: PDV, Integrador, painel ou outro serviço.
3. Tamanho máximo e frequência esperada dos backups.
4. Prazo de retenção por categoria.
5. Se o cliente também poderá enviar arquivos pelo portal.
6. Se uma contabilidade poderá ter vários usuários com e-CPF.
7. Se clientes poderão aprovar suas contabilidades ou somente o administrador.
8. Onde os arquivos ficarão em produção: disco local, servidor separado ou S3.
9. Estratégia de revogação e validação da cadeia dos certificados.
10. Política formal de privacidade, acesso, exclusão e resposta a incidentes.

Essas decisões não impedem a criação da base de documentos, mas devem estar
definidas antes de liberar o portal em produção.
