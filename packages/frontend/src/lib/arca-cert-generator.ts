import forge from 'node-forge';

interface GenerateCertificateInput {
  cuit: string;
  razonSocial: string;
}

interface GenerateCertificateResult {
  privateKeyPem: string;
  csrPem: string;
}

/**
 * Genera un keypair RSA 2048 y un CSR para ARCA en el navegador.
 * Retorna la clave privada en PEM y el CSR en PEM.
 */
export function generateArcaCertificate({
  cuit,
  razonSocial,
}: GenerateCertificateInput): GenerateCertificateResult {
  // Generar keypair RSA 2048
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Crear CSR
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([
    { name: 'countryName', value: 'AR' },
    { name: 'organizationName', value: razonSocial },
    { name: 'commonName', value: 'HoppinessHub' },
    { name: 'serialNumber', value: `CUIT ${cuit}` },
  ]);

  // Firmar con SHA-256
  csr.sign(keys.privateKey, forge.md.sha256.create());

  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const csrPem = forge.pki.certificationRequestToPem(csr);

  return { privateKeyPem, csrPem };
}

/**
 * Descarga el CSR como archivo .csr
 */
export function downloadCSR(csrPem: string, cuit: string) {
  const cuitClean = cuit.replace(/[-\s]/g, '');
  const blob = new Blob([csrPem], { type: 'application/pkcs10' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `solicitud_arca_${cuitClean}.csr`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
