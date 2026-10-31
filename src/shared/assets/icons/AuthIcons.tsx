import React from 'react';
import { SvgXml } from 'react-native-svg';

export const ICON_FACEBOOK_XML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z" fill="#1877F2"/>
<path d="M11.5 17V11H13.5L13.8 8.7H11.5V7.2C11.5 6.5 11.7 6.1 12.7 6.1H14V4C13.8 4 13 3.9 12.2 3.9C10.4 3.9 9.2 5 9.2 7V8.7H7.2V11H9.2V17H11.5Z" fill="white"/>
</svg>`;

export const ICON_GOOGLE_XML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19.6 10.2C19.6 9.5 19.5 8.8 19.4 8.2H10V12H15.4C15.2858 12.609 15.0499 13.1886 14.7062 13.7041C14.3625 14.2196 13.9182 14.6604 13.4 15V17.5H16.6C18.5 15.7 19.6 13.1 19.6 10.2Z" fill="#4285F4"/>
<path d="M10 20C12.7 20 15 19.1 16.6 17.5L13.4 15C12.5 15.6 11.4 16 10 16C7.4 16 5.2 14.2 4.4 11.9H1.1V14.5C1.931 16.1491 3.20242 17.536 4.77335 18.5068C6.34427 19.4776 8.15333 19.9944 10 20Z" fill="#34A853"/>
<path d="M4.4 11.9C4.19847 11.2869 4.09717 10.6453 4.1 10C4.1 9.3 4.2 8.7 4.4 8.1V5.5H1.1C0.386161 6.89322 0.00938583 8.43458 0 10C0 11.6 0.4 13.1 1.1 14.5L4.4 11.9Z" fill="#FBBC05"/>
<path d="M10 4C11.5 4 12.8 4.5 13.8 5.5L16.7 2.7C14.8976 0.970972 12.4977 0.00384195 10 0C8.15333 0.00559705 6.34427 0.522437 4.77335 1.49323C3.20242 2.46403 1.931 3.85086 1.1 5.5L4.4 8.1C5.2 5.8 7.4 4 10 4Z" fill="#EA4335"/>
</svg>`;

export const ICON_EMAIL_OR_PHONE_XML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 4.16667H15C16.3807 4.16667 17.5 5.28596 17.5 6.66667V13.3333C17.5 14.714 16.3807 15.8333 15 15.8333H5C3.61929 15.8333 2.5 14.714 2.5 13.3333V6.66667C2.5 5.28596 3.61929 4.16667 5 4.16667Z" stroke-width="1.5" stroke="#2C6BED"/>
<path d="M3.75 5.83333L10 10.8333L16.25 5.83333" stroke-width="1.5" stroke-linejoin="round" stroke="#2C6BED"/>
</svg>`;

export const ICON_PASSWORD_XML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.25 8.33333H13.75C14.9006 8.33333 15.8333 9.26607 15.8333 10.4167V14.5833C15.8333 15.7339 14.9006 16.6667 13.75 16.6667H6.25C5.09941 16.6667 4.16667 15.7339 4.16667 14.5833V10.4167C4.16667 9.26607 5.09941 8.33333 6.25 8.33333Z" stroke-width="1.5" stroke="#2C6BED"/>
<path d="M6.66667 8.33333V5.83333C6.66667 4.94928 7.01786 4.10143 7.64298 3.47631C8.2681 2.85119 9.11595 2.5 10 2.5C10.8841 2.5 11.7319 2.85119 12.357 3.47631C12.9821 4.10143 13.3333 4.94928 13.3333 5.83333V8.33333" stroke-width="1.5" stroke="#2C6BED"/>
</svg>`;

export const ICON_SHOW_PASSWORD_XML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.08333 10C2.08333 10 5 5 10 5C15 5 17.9167 10 17.9167 10C17.9167 10 15 15 10 15C5 15 2.08333 10 2.08333 10Z" stroke-width="1.5" stroke="#65758B"/>
<path d="M12.0833 10C12.0833 11.1506 11.1506 12.0833 10 12.0833C8.84941 12.0833 7.91667 11.1506 7.91667 10C7.91667 8.84941 8.84941 7.91667 10 7.91667C11.1506 7.91667 12.0833 8.84941 12.0833 10Z" stroke-width="1.5" stroke="#65758B"/>
</svg>`;

export function FacebookIcon({ size = 20 }: { size?: number }): React.ReactElement {
  return <SvgXml xml={ICON_FACEBOOK_XML} width={size} height={size} />;
}

export function GoogleIcon({ size = 20 }: { size?: number }): React.ReactElement {
  return <SvgXml xml={ICON_GOOGLE_XML} width={size} height={size} />;
}

export function EmailOrPhoneIcon({ size = 20 }: { size?: number }): React.ReactElement {
  return <SvgXml xml={ICON_EMAIL_OR_PHONE_XML} width={size} height={size} />;
}

export function PasswordIcon({ size = 20 }: { size?: number }): React.ReactElement {
  return <SvgXml xml={ICON_PASSWORD_XML} width={size} height={size} />;
}

export function ShowPasswordIcon({ size = 20 }: { size?: number }): React.ReactElement {
  return <SvgXml xml={ICON_SHOW_PASSWORD_XML} width={size} height={size} />;
}
