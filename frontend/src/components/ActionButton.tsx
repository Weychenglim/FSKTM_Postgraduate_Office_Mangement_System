/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PortalButton } from './PortalPrimitives';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  onClick,
  isLoading = false,
  className = '',
  ...props
}) => {
  return (
    <PortalButton
      onClick={onClick}
      variant="primary"
      size="lg"
      fullWidth
      isLoading={isLoading}
      icon={ArrowRight}
      iconPosition="right"
      disabled={isLoading || props.disabled}
      className={className}
      {...props}
    >
      {isLoading ? 'Verifying Credentials...' : children}
    </PortalButton>
  );
};
