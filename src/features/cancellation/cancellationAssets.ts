/* eslint-disable @typescript-eslint/no-require-imports */
export const cancellationAssets = {
  policy: require('../../shared/assets/cancellation/policy.png') as number,
  checked:
    require('../../shared/assets/cancellation/1113-4-imgTicketSelectedCheckbox.png') as number,
  unchecked:
    require('../../shared/assets/cancellation/1113-4-imgTicketSelectedCheckbox1.png') as number,
  processing:
    require('../../shared/assets/cancellation/1113-804-imgStatusProcessingBus.png') as number,
  received: require('../../shared/assets/cancellation/1113-804-imgProgressReceived.png') as number,
  verifying:
    require('../../shared/assets/cancellation/1113-804-imgProgressVerifying.png') as number,
  complete: require('../../shared/assets/cancellation/1113-804-imgProgressComplete.png') as number,
};
