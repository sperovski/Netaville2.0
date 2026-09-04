import type {NavigatorScreenParams} from '@react-navigation/native';

export type HomeStackParamList = {
  Home: undefined;
  Details: {id: string};
};

export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SettingsTab: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
