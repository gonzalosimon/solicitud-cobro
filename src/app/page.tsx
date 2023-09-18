"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import { isAfter, subDays } from "date-fns";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import axios from "axios";
import * as yup from "yup";
import "./styles.css";

interface FormData {
  description: string;
  first_due_date: Date;
  first_total: number;
  payer_name: string;
  payer_email?: string;
  sendByEmail?: boolean;
}

let URL_API = process.env.NEXT_PUBLIC_REACT_APP_PAGOS360_DEV_URL

const validationSchema = yup.object().shape({
  description: yup
    .string()
    .max(500, "La descripción no debe exceder los 500 caracteres")
    .required("Este campo es obligatorio"),
  first_due_date: yup
    .date()
    .typeError("Fecha inválida")
    .required("Este campo es obligatorio")
    .test("is-future", "La fecha debe ser a partir de hoy", (value) => {
      // Comprueba si la fecha ingresada es después de ayer (lo que significa que es hoy o en el futuro)
      return isAfter(value, subDays(new Date(), 1));
    }),
  first_total: yup
    .number()
    .typeError("Monto inválido")
    .required("Este campo es obligatorio")
    .test("is-decimal", "El formato del monto es inválido", (value) => {
      return (value || "").toString().match(/^\d{1,8}(\.\d{1,2})?$/) !== null;
    }),
  payer_name: yup
    .string()
    .max(255, "El nombre no debe exceder los 255 caracteres")
    .required("Este campo es obligatorio"),
  payer_email: yup.string().email("Debe ser un email válido"),
  otherwise: yup.string().notRequired(),
  sendByEmail: yup.boolean(),
});

const Home = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
  });
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [sendByEmail, setSendByEmail] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  const onSubmit = async ({
    description,
    first_due_date,
    first_total,
    payer_name,
    payer_email,
    sendByEmail,
  }: FormData) => {
    setIsLoading(true);
    try {
      const formattedDate = format(first_due_date, "dd-MM-yyyy");
      console.log("formattedDate", formattedDate);

      let requestData = {
        payment_request: {
          description: description,
          first_due_date: formattedDate,
          first_total: first_total,
          payer_name: payer_name,
          payer_email,
        },
      };

      if (sendByEmail) {
        requestData.payment_request.payer_email = payer_email;
      }

      const response = await axios.post(
        `${URL_API}/payment-request`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_REACT_APP_PAGOS360_API_KEY}`,
          },
        }
      );

      setCheckoutUrl(response.data.checkout_url);
      setIsLoading(false);
      setIsFormDisabled(true);
    } catch (error) {
      setIsLoading(false);
      setIsLoading(false);
      setApiError(
        "Hubo un problema al procesar tu solicitud. Inténtalo de nuevo."
      );
    }
  };

  const handleCopyClick = () => {
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit(onSubmit)}>
        <h1>Solicitud de Cobro</h1>

        <div className="cobro-por-email">
          <label>Enviar enlace de cobro por email</label>

          <input
            type="checkbox"
            {...register("sendByEmail")}
            onChange={(e) => setSendByEmail(e.target.checked)}
            disabled={isFormDisabled}
          />
        </div>

        {sendByEmail && (
          <input
            {...register("payer_email")}
            placeholder="Email del pagador"
            disabled={isFormDisabled}
          />
        )}
        {errors.payer_email && (
          <span className="error">{errors.payer_email.message}</span>
        )}

        <input
          {...register("description")}
          placeholder="Concepto del pago"
          disabled={isFormDisabled}
        />
        {errors.description && (
          <span className="error">{errors.description.message}</span>
        )}

        <input
          type="date"
          {...register("first_due_date")}
          disabled={isFormDisabled}
          {...register("first_due_date")}
          min={format(new Date(), "yyyy-MM-dd")}
        />

        {errors.first_due_date && (
          <span className="error">{errors.first_due_date.message}</span>
        )}

        <input
          {...register("first_total")}
          placeholder="200.99"
          disabled={isFormDisabled}
        />
        {errors.first_total && (
          <span className="error">{errors.first_total.message}</span>
        )}

        <input
          {...register("payer_name")}
          placeholder="Nombre del pagador"
          disabled={isFormDisabled}
        />
        {errors.payer_name && (
          <span className="error">{errors.payer_name.message}</span>
        )}

        <button type="submit" className="button-loading" disabled={isLoading}>
          {isLoading ? "Enviando..." : "Enviar solicitud de cobro"}
        </button>
      </form>

      {apiError && <div className="api-error">{apiError}</div>}

      {checkoutUrl && (
        <div className="checkout-url">
          <span>Enlace de pago:</span>

          <p>
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
              {checkoutUrl}
            </a>
          </p>

          <div className="buttons-bottom">
            <button onClick={handleCopyClick}>Copiar enlace</button>

            {isFormDisabled && (
              <button className="new-request" onClick={() => location.reload()}>
                Nueva solicitud
              </button>
            )}
          </div>

          {isCopied && <span className="copied-feedback">Enlace copiado!</span>}
        </div>
      )}
    </div>
  );
};

export default Home;
