import { useEffect, useState } from "react"
import axios from 'axios'
import * as zlib from 'react-zlib-js'
import { Buffer } from 'buffer'
import { participating_issuers as TRUSTED_ISSUERS } from './vci-issuers.json'
import { cvxToVaxTradename, mvxToCompanyName } from "./vaccineLabelMappings"
import { jws, KEYUTIL } from 'jsrsasign'

export interface QRScanResult {
  verification: VerificationResult,
  patient: Patient,
  doses: Dose[],
}

export enum VerificationStatus {
  Invalid,
  Unverified,
  Verified
}

interface VerificationResult {
  issuer: string,
  date?: Date
  status: VerificationStatus
}

interface Patient {
  name: string,
  DOB: Date
}

enum IdentityAssuranceLevel {
  IAL1_2 = "IAL1.2",
  IAL1_4 = "IAL1.4",
  IAL2 = "IAL2",
  IAL3 = "IAL3",
}

interface Dose {
  date: Date,
  performer?: string,
  vaccineLabel?: string,
  manufacturerLabel?: string,
  lotNumber?: string,
  cvx?: string,
  mvx?: string,
  snomedId?: string,
  identityAssuranceLevel?: IdentityAssuranceLevel
}

function parseDateInLocalTimezone(date: string) {
  const dateParts = date.split(/\D/)
  return new Date(parseInt(dateParts[0]), parseInt(dateParts[1])-1, parseInt(dateParts[2]))
}

export const useQRScanResult = (rawQRInputs: string[]) => {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [result, setResult] = useState<QRScanResult>()
  const [error, setError] = useState<String>()

  const extractQRResult = async (rawQRInput: string) => {
    if (!rawQRInput) {
      throw new Error("QR code data is empty")
    }

    if (rawQRInput.substring(0, 5) != 'shc:/') {
      throw new Error("QR code does not look like a SMART health card")
    }

    const numericallyEncodedContent = rawQRInput.substring(5).match(/(..?)/g)

    if (!numericallyEncodedContent || numericallyEncodedContent.length < 1) {
      throw new Error("Missing SMART health card data")
    }

    const jwsContent = numericallyEncodedContent
      .map(num => String.fromCharCode(parseInt(num, 10) + 45))
      .join('')

    console.log('jwksContent', jwsContent)

    const [,payload,] = jwsContent.split('.');
    const decodedPayload = Buffer.from(payload, 'base64');
    const decompressedCard = zlib.inflateRawSync(decodedPayload);
    const cardJson = JSON.parse(decompressedCard.toString());
    console.log('cardJson', cardJson)

    const result = {} as QRScanResult

    const trustedIssuer = TRUSTED_ISSUERS.find(entity => entity.iss === cardJson.iss)

    result.verification = {} as any

    result.verification.issuer = (trustedIssuer && trustedIssuer.name) || cardJson.iss

    try {
      const {data: issuerPubkey} = await axios.get(`${cardJson.iss}/.well-known/jwks.json`)
      console.log('pubkey URL', `${cardJson.iss}/.well-known/jwks.json`)
      console.log(issuerPubkey)

      const importedPubkey = KEYUTIL.getKey(issuerPubkey.keys[0])
      const isValidJwks = jws.JWS.verify(jwsContent, importedPubkey, ["ES256"])

      if (isValidJwks && trustedIssuer) {
        result.verification.status = VerificationStatus.Verified
      } else if (isValidJwks) {
        result.verification.status = VerificationStatus.Unverified
      } else {
        result.verification.status = VerificationStatus.Invalid
      }
    } catch (e) {
      // Silently continue, this means it could not be verified
      console.error('JWK error: ', e)

      result.verification.status = VerificationStatus.Invalid
    }
    result.verification.date = new Date(0)
    result.verification.date.setUTCSeconds(cardJson.nbf)

    const fhirBundle = cardJson.vc.credentialSubject.fhirBundle
    console.log('fhirBundle', fhirBundle)
    const entries = fhirBundle.entry
    result.doses = []
    for (const entry of entries) {
      const resource = entry.resource
      if (resource?.resourceType === 'Patient') {
        const name = resource.name[0]

        result.patient = {
          name: [name?.given, name?.family].filter(name => name).flat().join(' '),
          DOB: parseDateInLocalTimezone(resource.birthDate)
        }
      } else if (resource?.resourceType === 'Immunization') {
        const dose = {} as Dose
        
        dose.date = parseDateInLocalTimezone(resource.occurrenceDateTime)
        dose.mvx = resource.manufacturer?.identifier?.value
        dose.lotNumber = resource.lotNumber
        dose.performer = resource.performer?.[0].actor?.display
        const coding = resource.vaccineCode?.coding
        if (coding.length) {
          dose.cvx = coding.find((item: { system: string }) => item.system === "http://hl7.org/fhir/sid/cvx")?.code
          dose.snomedId = coding.find((item: { system: string }) => item.system === "http://snomed.info/sct")?.code
        }
        dose.vaccineLabel = dose.cvx && cvxToVaxTradename[dose.cvx]
        dose.manufacturerLabel = dose.mvx && mvxToCompanyName[dose.mvx]
        dose.identityAssuranceLevel = resource.meta?.security?.[0]?.code

        result.doses.push(dose)
      }
    }

    const { compare } = Intl.Collator('en-US');
    result.doses.sort((a, b) => compare(a.date.toISOString(), b.date.toISOString()));

    return result
  }

  const extractQRResultFromArray = async () => {
    let result, extractionError
    for (const rawQRInput of rawQRInputs) {
      try {
        result = await extractQRResult(rawQRInput)
      } catch (e: unknown) {
        if (e instanceof Error) {
          extractionError = e.message
        }
      }
    }

    if (result) {
      setResult(result)
    } else if (extractionError) {
      setError(extractionError)
    } else {
      setError('No QR codes')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    extractQRResultFromArray()
  }, [])

  return { isLoading, result, error }
}