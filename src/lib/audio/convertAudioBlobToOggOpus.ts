let ffmpegLoadPromise: Promise<{ ffmpeg: any; fetchFile: any }> | null = null;

async function getFfmpeg() {
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);

      const ffmpeg = new FFmpeg();

      // Use jsdelivr CDN (more reliable than unpkg in some networks)
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      const workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript');

      await ffmpeg.load({ coreURL, wasmURL, workerURL });

      return { ffmpeg, fetchFile };
    })();
  }

  return ffmpegLoadPromise;
}

export async function convertAudioBlobToOggOpus(input: Blob): Promise<Blob> {
  const { ffmpeg, fetchFile } = await getFfmpeg();

  const inputData: Uint8Array = await fetchFile(input);
  const mime = (input.type || '').split(';')[0].toLowerCase();

  const inferExtFromMime = (m: string): string => {
    if (m.includes('wav')) return 'wav';
    if (m.includes('ogg')) return 'ogg';
    if (m.includes('mpeg')) return 'mp3';
    if (m.includes('mp4')) return 'm4a';
    if (m.includes('webm')) return 'webm';
    return 'bin';
  };

  const startsWithAscii = (bytes: Uint8Array, ascii: string, offset = 0) => {
    if (bytes.length < offset + ascii.length) return false;
    for (let i = 0; i < ascii.length; i++) {
      if (bytes[offset + i] !== ascii.charCodeAt(i)) return false;
    }
    return true;
  };

  const inferExtFromHeader = (bytes: Uint8Array): string => {
    if (bytes.length >= 12 && startsWithAscii(bytes, 'RIFF') && startsWithAscii(bytes, 'WAVE', 8)) return 'wav';
    if (bytes.length >= 4 && startsWithAscii(bytes, 'OggS')) return 'ogg';
    if (bytes.length >= 8 && startsWithAscii(bytes, 'ftyp', 4)) return 'm4a';
    if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'webm';
    if (bytes.length >= 3 && startsWithAscii(bytes, 'ID3')) return 'mp3';
    return 'bin';
  };

  const mimeExt = inferExtFromMime(mime);
  const headerExt = inferExtFromHeader(inputData);
  const finalExt = headerExt !== 'bin' ? headerExt : mimeExt;

  const inputName = `input.${finalExt}`;
  const outputName = 'output.ogg';

  await ffmpeg.writeFile(inputName, inputData);

  // WhatsApp voice note compatibility: OGG container + Opus codec, mono, 48kHz.
  await ffmpeg.exec([
    '-i',
    inputName,
    '-ac',
    '1',
    '-ar',
    '48000',
    '-c:a',
    'libopus',
    '-b:a',
    '24k',
    '-vbr',
    'on',
    '-application',
    'voip',
    outputName,
  ]);

  const outputData = await ffmpeg.readFile(outputName);

  // Cleanup
  try {
    await ffmpeg.deleteFile(inputName);
  } catch {
    // ignore
  }
  try {
    await ffmpeg.deleteFile(outputName);
  } catch {
    // ignore
  }

  return new Blob([outputData], { type: 'audio/ogg' });
}
