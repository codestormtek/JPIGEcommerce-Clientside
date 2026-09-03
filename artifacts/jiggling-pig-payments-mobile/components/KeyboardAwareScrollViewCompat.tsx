import React from 'react';
import { Platform, ScrollViewProps, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export const KeyboardAwareScrollViewCompat = React.forwardRef<any, ScrollViewProps & { bottomOffset?: number }>(
  (props, ref) => {
    if (Platform.OS === 'web') {
      const { bottomOffset, ...rest } = props;
      return <ScrollView ref={ref} {...rest} />;
    }
    return <KeyboardAwareScrollView ref={ref} {...props} />;
  }
);
KeyboardAwareScrollViewCompat.displayName = 'KeyboardAwareScrollViewCompat';
