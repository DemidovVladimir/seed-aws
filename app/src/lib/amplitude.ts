import Amplitude from 'amplitude'

const amplitude = new Amplitude(process.env.AMPLITUDE_API_KEY!, {
  tokenEndpoint: process.env.AMPLITUDE_TOKEN_ENDPOINT,
})

export default amplitude
