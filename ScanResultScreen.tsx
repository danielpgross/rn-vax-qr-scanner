import React from "react"
import { ScrollView, Text, View, StyleSheet} from "react-native"
import { useQRScanResult, VerificationStatus } from "./useQRScanResult"
import Icon from 'react-native-vector-icons/Octicons';

const ScanResultScreen = ({ route }) => {
  const {isLoading, result, error} = useQRScanResult(route.params.rawQRInputs)

  const dateFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' } as const

  const Field = ({ style, size, label, content }: {
    style?: Object
    size?: 'small' | 'regular'
    label: String
    content?: String
  }) => (
    <View style={style}>
      <Text style={size === 'small' ? styles.fieldLabelSm : styles.fieldLabel}>{label}</Text>
      <Text selectable={true} style={size === 'small' ? styles.fieldContentSm : styles.fieldContent}>{content}</Text>
    </View>
  )

  const identityAssuranceLevelDescriptions = {
    "IAL1.2": "An unspecified ID was used to verify name and birth date.",
    "IAL1.4": "A US state-issued photo ID or nationally-issued photo ID was used to verify name and birth date.",
    "IAL2": "Either remote or in-person identity proofing is required. IAL2 requires identifying attributes to have been verified in person or remotely using, at a minimum, the procedures given in NIST Special Publication 800-63A.",
    "IAL3": "In-person identity proofing is required. Identifying attributes must be verified by an authorized CSP representative through examination of physical documentation as described in NIST Special Publication 800-63A."
  }

  const VerificationBadge = ({iconName, iconColor, label, detailText}: {
    iconName: String
    iconColor: String
    label: String
    detailText?: String
  }) => (
    <>
      <View style={{alignItems: 'center', flex: 1, flexDirection: 'row'}}>
        <Icon name={iconName} size={24} color={iconColor} />
        <Text style={{fontSize: 18, marginLeft: 4, fontWeight: '600'}}>{label}</Text>
      </View>
      {detailText && <Text style={{marginTop: 2, marginLeft: 28, fontSize: 14}}>
        {detailText}
      </Text>}
    </>
  )

  const styles = StyleSheet.create({
    header: {
      fontFamily: 'System',
      fontWeight: 'bold',
      fontSize: 26,
      marginHorizontal: 8,
      marginVertical: 6,
      marginTop: 14
    },
    section: {
      backgroundColor: 'white',
      borderRadius: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    horizontalRuleStyle: {
      borderBottomColor: '#DEDEDE',
      borderBottomWidth: 1,
      marginTop: 7,
      marginBottom: 7
    },
    fieldContent: {
      fontSize: 17,
    },
    fieldContentSm: {
      fontSize: 15
    },
    fieldLabel: {
      color: '#7c7c7c',
      fontSize: 15,
      paddingBottom: 2
    },
    fieldLabelSm: {
      color: '#7c7c7c',
      fontSize: 13,
      paddingBottom: 1
    }
  })

  if (!result) {
    return (
      <View>
        <Text>Loading</Text>
      </View>
    )
  }

  return (
    <ScrollView style={{
      backgroundColor: '#F1F2F6'
    }} contentContainerStyle={{padding: 18}}>
      <Text style={{
        ...styles.header,
        fontSize: 34,
        marginHorizontal: 0
      }}>Vaccination details</Text>
      <Text style={styles.header}>Verification</Text>
      <View style={styles.section}>
        
        {result.verification?.status == VerificationStatus.Verified &&
          <VerificationBadge
            iconName="verified"
            iconColor="green"
            label="Verified"
          />
        }
        {result.verification?.status == VerificationStatus.Unverified &&
          <VerificationBadge
            iconName="unverified"
            iconColor="orange"
            label="Unverified"
            detailText="The health data was crypographically verified, but the issuer was not recognized."
          />
        }
        {result.verification?.status == VerificationStatus.Invalid &&
          <VerificationBadge
            iconName="alert"
            iconColor="crimson"
            label="Invalid"
            detailText="The health data failed crypographic verification."
          />
        }
        <View style={styles.horizontalRuleStyle} />

        <Field label="Issuer" content={result.verification?.issuer} />
        <View style={styles.horizontalRuleStyle} />
        
        <Field
          label="Date/time issued"
          content={result.verification?.date?.toLocaleDateString(undefined, dateFormatOptions) + ' ' + result.verification?.date?.toLocaleTimeString()}
        />
      </View>

      <Text style={styles.header}>Patient</Text>
      <View style={{
        ...styles.section,
        flex: 1,
        flexDirection: 'row',
      }}>
        <Field
          label="Name"
          content={result.patient?.name}
          style={{flex: 1}}
        />
        
        <Field
          label="Date of birth"
          content={result.patient?.DOB?.toLocaleDateString(undefined, dateFormatOptions)}
          style={{flex: 1}}
        />
      </View>
      
      <Text style={styles.header}>Doses</Text>
      {result.doses && result.doses.map((dose => (
        <View style={{...styles.section, marginBottom: 24}}>
          <Text style={{
            fontFamily: 'System',
            fontWeight: 'bold',
            fontSize: 22,
            marginBottom: 12
          }}>{dose.date.toLocaleDateString(undefined, dateFormatOptions)}</Text>
          
          <Field
            label="Provider"
            content={dose.performer}
          />
          <View style={styles.horizontalRuleStyle} />
        
          <Field
            label="Vaccine"
            content={dose.vaccineLabel}
          />
          <View style={styles.horizontalRuleStyle} />

          <Field
            label="Manufacturer"
            content={dose.manufacturerLabel}
          />
          <View style={styles.horizontalRuleStyle} />

          <View style={{
            flex: 1,
            flexDirection: "row"
          }}>
            <Field
              label="Lot number"
              content={dose.lotNumber}
              style={{flex: 1, flexGrow: 2}}
              size="small"
            />
            <Field
              label="CVX"
              content={dose.cvx}
              style={{flex: 1, flexGrow: 1}}
              size="small"
            />
            <Field
              label="MVX"
              content={dose.mvx}
              style={{flex: 1, flexGrow: 1}}
              size="small"
            />
            <Field
              label="SNOMED"
              content={dose.snomedId}
              style={{flex: 1, flexGrow: 4}}
              size="small"
            />
          </View>
          <View style={styles.horizontalRuleStyle} />

          <Field
            label="Identity assurance details"
            content={identityAssuranceLevelDescriptions[dose.identityAssuranceLevel]}
            size="small"
          />
        </View>
      )))}
    </ScrollView>
  )
}

export default ScanResultScreen