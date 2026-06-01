import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { ReactNode, useState } from 'react';
import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { BRAND } from '@getgas/config';

/** Light-theme tokens aligned with web `globals.css` */
export const authColors = {
  brand: BRAND.primary,
  brandDark: BRAND.primaryDark,
  bg: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgCard2: '#F0F0F0',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  errorBorder: 'rgba(239, 68, 68, 0.2)',
  card: '#F9FAFB',
};

export function BrandLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 40 : 48;
  const icon = size === 'sm' ? 20 : 24;
  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandIcon, { width: box, height: box, borderRadius: box * 0.25 }]}>
        <MaterialCommunityIcons name="fire" size={icon} color="#fff" />
      </View>
      <Text style={[styles.brandName, size === 'sm' && styles.brandNameSm]}>{BRAND.name}</Text>
    </View>
  );
}

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  showBrandLogo = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showBrandLogo?: boolean;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showBrandLogo ? (
          <View style={styles.logoBlock}>
            <BrandLogo />
          </View>
        ) : null}

        <View style={styles.headline}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {children}
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function AuthInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={authColors.textMuted}
    />
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  showArrow = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  showArrow?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>{label}</Text>
          {showArrow ? <Ionicons name="arrow-forward" size={16} color="#fff" /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function GoogleButton({
  onPress,
  loading,
  disabled,
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.googleButton, (disabled || loading) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={authColors.text} />
      ) : (
        <View style={styles.googleInner}>
          <AntDesign name="google" size={20} color="#4285F4" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function AuthDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.divider} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.divider} />
    </View>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.linkWrap}>
      <Text style={styles.link}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AuthInlineLink({
  prefix,
  linkLabel,
  onPress,
}: {
  prefix: string;
  linkLabel: string;
  onPress: () => void;
}) {
  return (
    <Text style={styles.inlineWrap}>
      <Text style={styles.inlineMuted}>{prefix} </Text>
      <Text style={styles.inlineLink} onPress={onPress}>
        {linkLabel}
      </Text>
    </Text>
  );
}

export function PhonePrefixInput({
  value,
  onChangeText,
  error,
}: {
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
}) {
  return (
    <View>
      <View style={styles.phoneRow}>
        <View style={[styles.prefix, error ? styles.inputErrorBorder : null]}>
          <Text style={styles.flag}>🇬🇭</Text>
          <Text style={styles.prefixText}>+233</Text>
        </View>
        <AuthInput
          style={[
            styles.phoneInput,
            error ? styles.inputErrorBorder : null,
          ]}
          placeholder="XXXXXXXXX"
          keyboardType="phone-pad"
          value={value}
          onChangeText={(t: string) => onChangeText(t.replace(/\D/g, '').slice(0, 10))}
          maxLength={10}
        />
      </View>
      <ErrorText message={error} />
    </View>
  );
}

export function PasswordInput({
  value,
  onChangeText,
  error,
  placeholder = 'Enter your password',
}: {
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <View style={styles.passwordWrap}>
        <AuthInput
          style={[styles.passwordInput, error ? styles.inputErrorBorder : null]}
          placeholder={placeholder}
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.eyeBtn}
          hitSlop={8}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={authColors.textMuted}
          />
        </Pressable>
      </View>
      <ErrorText message={error} />
    </View>
  );
}

export function OtpInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <View>
      <AuthInput
        style={styles.otpInput}
        placeholder="4-digit code"
        keyboardType="number-pad"
        maxLength={4}
        value={value}
        onChangeText={(t: string) => onChange(t.replace(/\D/g, '').slice(0, 4))}
      />
      <ErrorText message={error} />
    </View>
  );
}

export function DevOtpHint({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <View style={styles.devBox}>
      <Text style={styles.devText}>Dev OTP: {code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: authColors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoBlock: { alignItems: 'center', marginBottom: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    backgroundColor: authColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: authColors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: { fontSize: 18, fontWeight: '900', color: authColors.text, letterSpacing: -0.3 },
  brandNameSm: { fontSize: 16 },
  headline: { marginBottom: 28, alignItems: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: authColors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: authColors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: authColors.textMuted,
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  input: {
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    fontSize: 14,
    backgroundColor: authColors.bgCard2,
    color: authColors.text,
  },
  inputErrorBorder: { borderColor: '#F87171' },
  phoneRow: { flexDirection: 'row' },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: authColors.border,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: authColors.bgCard2,
  },
  flag: { fontSize: 16 },
  prefixText: { fontSize: 14, fontWeight: '500', color: authColors.textMuted },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  otpInput: { letterSpacing: 8, textAlign: 'center', fontSize: 22, fontWeight: '700' },
  button: {
    backgroundColor: authColors.brand,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: authColors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  googleButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: authColors.border,
    backgroundColor: authColors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleText: { fontSize: 14, fontWeight: '600', color: authColors.text },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: authColors.border },
  dividerText: { color: authColors.textMuted, fontSize: 12, fontWeight: '500' },
  linkWrap: { marginTop: 12, alignItems: 'center' },
  link: { color: authColors.brand, fontSize: 14, fontWeight: '600' },
  inlineWrap: { textAlign: 'center', fontSize: 14, lineHeight: 22 },
  inlineMuted: { color: authColors.textMuted },
  inlineLink: { color: authColors.brand, fontWeight: '600' },
  fieldError: { color: authColors.error, fontSize: 12, marginTop: 4 },
  errorBanner: {
    backgroundColor: authColors.errorBg,
    borderWidth: 1,
    borderColor: authColors.errorBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: authColors.error, fontSize: 14 },
  devBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  devText: { color: '#92400E', fontSize: 13, textAlign: 'center' },
});
