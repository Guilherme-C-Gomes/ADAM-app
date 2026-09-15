import { useEffect, useState } from 'react'

/**
 * Simula a espera por dados enquanto o backend nao existe.
 *
 * Serve para exercitar os estados de carregamento das telas na
 * demonstracao. Quando o Supabase entrar, cada tela troca isto pelo
 * `isLoading` da consulta real e o resto do codigo nao muda.
 *
 * 1400ms e de proposito: a regra de ritmo do design diz que a espera
 * precisa ser maior que a animacao do quadro. Com 700ms o brilho do
 * esqueleto (1200ms por passada) nem chegava a atravessar a tela.
 */
export function useCarregamento(ms = 1400) {
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setCarregando(false), ms)
    return () => clearTimeout(id)
  }, [ms])

  return carregando
}
