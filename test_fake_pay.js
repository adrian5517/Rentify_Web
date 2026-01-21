(async ()=>{
  try{
    const res = await fetch('http://localhost:10000/api/payments/fake-pay',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Njg2M2I5ZThhODFjZjlkNmU4ZWNmOSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2ODQ0OTEwNywiZXhwIjoxNzY5MDUzOTA3fQ.Cy2n4lEL74IqN0d93kvDGk6B5kxRUQf6w1quw0O4cls'},
      body: JSON.stringify({ contractId: '000000000000000000000000', amount: 1000, currency: 'PHP'})
    })
    console.log('status', res.status)
    const txt = await res.text()
    console.log(txt)
  }catch(e){
    console.error('error', e.message || e)
  }
})()
