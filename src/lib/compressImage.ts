/**
 * Redimensiona (máx 800px) e converte para JPEG 75% no navegador.
 * Usado nas evidências com foto (finalizar aula, solicitações do aluno).
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Usa createObjectURL em vez de readAsDataURL para evitar string base64
    // gigante na memória (base64 é ~33% maior que o arquivo original)
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      // Libera o object URL assim que a imagem carregou — não precisa mais
      URL.revokeObjectURL(objectUrl);

      // Máx 800px é suficiente para evidência de aula e poupa ~55% de RAM
      // em relação ao limite anterior de 1200px
      const maxDim = 800;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      } else {
        if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { return reject("Sem contexto 2D"); }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          // Destrói o canvas imediatamente após obter o blob
          canvas.width = 0;
          canvas.height = 0;
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            reject("Erro na compressão");
          }
        },
        "image/jpeg",
        0.75
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject("Erro ao carregar imagem");
    };
  });
}
