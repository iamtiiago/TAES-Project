Feature: US12 - Sous-Chef

  Background:
    Given que configurei um perfil vegetariano de teste para duas porções no Sous-Chef

  Scenario: Gerar com stock válido, guardar e consultar uma receita após recarregar
    Given tenho "Tomate" na despensa com validade "2099-12-31"
    And tenho "Leite expirado" na despensa com validade "2000-12-31"
    When peço uma sugestão com sobras
    Then vejo a receita "Tomate assado" com duas porções, ingredientes e preparação
    When guardo a sugestão e volto às receitas após recarregar
    Then posso consultar a sugestão guardada "Tomate assado"

  Scenario: Informar que a despensa está vazia
    When peço uma sugestão com sobras
    Then o Sous-Chef mostra o aviso "Adiciona alimentos com stock e dentro da validade para gerar uma sugestão."
    And não há uma sugestão para guardar

  Scenario Outline: Apresentar ausência de sugestão para o stock ou as restrições
    Given tenho "<alimento>" na despensa com validade "2099-12-31"
    When peço uma sugestão com sobras
    Then o Sous-Chef indica que não encontrou uma sugestão
    And não há uma sugestão para guardar

    Examples:
      | alimento            |
      | Cebola              |
      | Manteiga de amendoim |

  Scenario Outline: Informar da falha e preservar os alimentos guardados
    Given tenho "<alimento>" na despensa com validade "2099-12-31"
    When peço uma sugestão com sobras
    Then o Sous-Chef mostra o aviso "<mensagem>"
    And não há uma sugestão para guardar
    And "<alimento>" continua guardado na despensa

    Examples:
      | alimento | mensagem |
      | Curgete  | O serviço de sugestões está indisponível. Tenta novamente mais tarde. |
      | Cenoura  | O serviço de sugestões está indisponível. Tenta novamente mais tarde. |
      | Pimento  | O projeto Google configurado não tem acesso ao escalão gratuito da Gemini. Usa uma chave de um projeto elegível ou ativa a faturação no Google AI Studio. |
