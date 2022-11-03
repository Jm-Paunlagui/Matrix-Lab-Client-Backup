import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import logo from "../../assets/img/android-chrome-192x192.png";
import { ICON_PLACE_SELF_CENTER } from "../../assets/styles/input-types-styles";
import BackNavigation from "../../components/navbars/BackNavigation";
import httpClient from "../../http/httpClient";
import { toast } from "react-toastify";
import {
  TFAbyEmail,
  UsernamePassword,
  VerifyTFA,
} from "../../forms/CredentialForms";
import { importSPKI, jwtVerify } from "jose";
import { MATRIX_RSA_PUBLIC_KEY } from "../../helpers/Helper";
import { authenticate, isAuth, setLocalStorage } from "../../helpers/Auth";

/**
 * @description User login form for the application
 */
export default function AuthLogin() {
  /**
   * @description State variables for the login form.
   * @param {string} email - Email of the user.
   * @param {string} password - Password of the user.
   */
  const [authForm, setAuthForm] = useState({
    buttonDisabled: true,
    code: "",
    email: "",
    id1: "",
    id2: "",
    id3: "",
    password: "",
    textChange: "Sign In",
    textChange2: "",
    username: "",
  });

  const navigate = useNavigate();

  /**
   * @description Destructs the state variables
   */
  const {
    buttonDisabled,
    code,
    email,
    id1,
    id2,
    id3,
    password,
    textChange,
    textChange2,
    username,
  } = authForm;

  /**
   * @description Handles the Error/Success animation and messages for the login form.
   */
  const [oki, setOki] = useState(false);
  const [errorEffect, setErrorEffect] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [countDown, setCountDown] = useState(0);

  /**
   * @description For step counter in the forgot password form.
   */
  const [count, setCount] = useState(1);

  /**
   * @description Handles the change of the input fields in the login form.
   * @param event
   */
  const handleAuthFormChange = (event) => {
    const { name, value } = event.target;
    setAuthForm({
      ...authForm,
      [name]: value,
    });
    // reset the error message when the user starts typing and error effect set to false.
    setErrorEffect(false);
    setErrorMessage("");
  };

  /**
   * @description Count down function to reset the 2FA code after 30 seconds.
   */
  function countDownFunction() {
    setCountDown(countDown - 1);
  }

  /**
   * @description useEffect to reset the 2FA code after 30 seconds
   */
  useEffect(() => {
    if (count >= 3) {
      if (countDown > 0) {
        setTimeout(countDownFunction, 1000);
        setAuthForm({
          ...authForm,
          buttonDisabled: true,
        });
      } else {
        setAuthForm({
          ...authForm,
          code: "",
          buttonDisabled: false,
        });
      }
    }
  }, [countDown]);

  /**
   * @description Handles the auth form submission and makes a POST request to the backend.
   * @param event
   */
  const handleAuthFormSubmit = async (event) => {
    event.preventDefault();
    setOki(true);
    setAuthForm({
      ...authForm,
      textChange: "Signing In",
    });
    await httpClient
      .post("/user/authenticate", {
        username,
        password,
      })
      .then(async (response) => {
        jwtVerify(
          response.data.emails,
          await importSPKI(MATRIX_RSA_PUBLIC_KEY, "RS256"),
        )
          .then((result) => {
            setAuthForm({
              ...authForm,
              id1: result.payload.id1,
              id2: result.payload.id2,
              id3: result.payload.id3,
              textChange: "Continue",
            });
          })
          .catch((error) => {
            setErrorMessage(error.message);
            setErrorEffect(true);
            setOki(false);
            setAuthForm({ ...authForm, textChange: "Next" });
          });
        setCount(count + 1);
        setOki(false);
      })
      .catch((error) => {
        setErrorEffect(true);
        setErrorMessage(error.response.data.message);
        setOki(false);
        setAuthForm({
          ...authForm,
          textChange: "Sign In",
        });
      });
  };

  /**
   * @description Sends the 2FA code to the users email.
   * @param event
   * @returns {Promise<void>}
   */
  const handle2FAFormSubmit = async (event) => {
    event.preventDefault();
    setOki(true);
    setAuthForm({
      ...authForm,
      textChange: "Sending Code",
    });
    await httpClient
      .post("/user/checkpoint-2fa", {
        email,
      })
      .then((response) => {
        toast(`${response.data.message}`, { type: "info" });
        setCountDown(30);
        setCount(count + 1);
        setAuthForm({
          ...authForm,
          textChange: "Verify code",
          textChange2: "Resend code",
        });
        setOki(false);
      })
      .catch((error) => {
        setErrorEffect(true);
        setErrorMessage(error.response.data.message);
        setOki(false);
        setAuthForm({
          ...authForm,
          textChange: "Verify",
        });
      });
  };

  /**
   * @description Verifies the 2FA code and makes a POST request to the backend.
   * @param event
   * @returns {Promise<void>}
   */
  const handle2FAVerifyFormSubmit = async (event) => {
    event.preventDefault();
    setOki(true);
    setAuthForm({
      ...authForm,
      textChange: "Verifying",
    });
    await httpClient
      .post("/user/verify-2fa", {
        code,
      })
      .then(async (response) => {
        jwtVerify(
          response.data.token,
          await importSPKI(MATRIX_RSA_PUBLIC_KEY, "RS256"),
        )
          .then((result) => {
            setLocalStorage("user", result.payload);
            authenticate(response, () => {
              toast(`Welcome back ${username}!`, {
                type: "success",
                bodyClassName: "toastify-body",
              });
              setAuthForm({
                ...authForm,
                textChange: "Success",
              });
              isAuth().role === "admin"
                ? navigate(response.data.path)
                : navigate(response.data.path);
            });
          })
          .catch((error) => {
            toast(`Error: ${error}`, { type: "error" });
            navigate("/invalid-token");
          });
      })
      .catch((error) => {
        setErrorEffect(true);
        setErrorMessage(error.response.data.message);
        setOki(false);
        setAuthForm({
          ...authForm,
          code: "",
          textChange: "Verify",
        });
      });
  };

  return (
    <div className="container h-full mx-auto font-Montserrat">
      <div className="flex items-center content-center justify-center h-full">
        <div className="w-11/12 md:w-7/12 lg:w-6/12 xl:w-5/12">
          <div
            className={`relative flex flex-col w-full min-w-0 break-words bg-white border rounded-lg shadow-lg 
                ${errorEffect && `animate-wiggle`}`}
            onAnimationEnd={() => setErrorEffect(false)}
          >
            <BackNavigation backTo={"/"} hasText={false} isSmall />
            <div className={"px-6 lg:px-28"}>
              <div className="flex items-center justify-center py-2 text-gray-800">
                <img alt="logo" className="w-12 h-12 -mt-12" src={logo} />
              </div>
              <div className="flex-auto pt-0 mb-24 -mt-14">
                <h6 className="mt-16 text-lg font-bold text-gray-500 xl:text-2xl">
                  {count === 1
                    ? "Sign in to MATRIX LAB"
                    : count === 2
                    ? "Verify your identity"
                    : "Two-factor authentication"}
                </h6>
                <div className="mt-4 text-start">
                  {count === 1 ? null : count === 2 ? (
                    <p className="text-gray-500">{authForm.username}</p>
                  ) : (
                    <p className="text-gray-500">
                      <FontAwesomeIcon
                        className={`${ICON_PLACE_SELF_CENTER}`}
                        icon={faEnvelope}
                        size={"lg"}
                      />
                      We emailed a code to {email}. Please enter the code to
                      sign in.
                    </p>
                  )}
                </div>
                {count === 1
                  ? new UsernamePassword(
                      errorEffect,
                      errorMessage,
                      handleAuthFormChange,
                      handleAuthFormSubmit,
                      oki,
                      password,
                      textChange,
                      username,
                    )
                  : count === 2
                  ? new TFAbyEmail(
                      email,
                      errorEffect,
                      errorMessage,
                      handle2FAFormSubmit,
                      handleAuthFormChange,
                      id1,
                      id2,
                      id3,
                      oki,
                      textChange,
                    )
                  : new VerifyTFA(
                      authForm,
                      buttonDisabled,
                      code,
                      count,
                      countDown,
                      errorEffect,
                      errorMessage,
                      handle2FAFormSubmit,
                      handle2FAVerifyFormSubmit,
                      handleAuthFormChange,
                      oki,
                      setAuthForm,
                      setCount,
                      setErrorMessage,
                      textChange,
                      textChange2,
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
