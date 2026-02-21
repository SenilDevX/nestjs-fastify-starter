import { SetMetadata } from '@nestjs/common';

export const ALLOW_PRE_TWO_FACTOR_KEY = 'allowPreTwoFactor';
export const AllowPreTwoFactor = () =>
  SetMetadata(ALLOW_PRE_TWO_FACTOR_KEY, true);
