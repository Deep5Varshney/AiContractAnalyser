const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: "ap-south-1_4qfw0RjRC",
      userPoolClientId: "297icaqmo0r8i6ciqrehhvhpj2",
      signUpVerificationMethod: "code",
      loginWith: {
        email: true,
      },
    },
  },
};

export default awsConfig;