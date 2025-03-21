В примере использованы следующие проекты:  
https://github.com/jpatacas/ifcjs-viewer  
https://github.com/tangl-services/tangl-dev/tree/main/tangl-demo-playground

# Интеграция BIM-моделей с расширенными данными через SQLite и веб-вьюверы

## MVP системы
Минимально жизнеспособный продукт (MVP), объединяющий BIM-модели (формат IFC) с дополнительными данными из SQLite для:  
✅ **Совместной передачи** (IFC + SQLite в одном пакете)  
✅ **Редактирования данных** через веб-интерфейс  
✅ **Просмотра** модели с расширенной информацией  
🔗 Связь реализована через `GlobalID` элементов без модификации исходного IFC-файла.

---

## Основные компоненты системы

### 1. Веб-платформы (IFC.JS, Tangl viewer)

### 2. Бекенд Node.js с генерацией SQLite-хранилищ 

### 3.  Описание полей тестовой таблицы 
Параметры взяты из ПНСТ 909-2024 
«Требование к цифровым информационным моделям объектов непроизводственного назначения. Часть 1. Жилые здания» Таблица 12. https://www.minstroyrf.gov.ru/docs/358796/ 

| **Поле**             | **Тип** | **Описание**                                                                 |
|-----------------------|---------|-----------------------------------------------------------------------------|
| `globalid`            | TEXT    | Уникальный идентификатор элемента в IFC-модели (`GlobalID`). Обязательное поле, используется для связи с BIM-объектом. |
| `vocabulary`          | TEXT    | Классификатор или тип элемента (например, "Стена", "Окно"). Может ссылаться на внешний словарь. |
| `RUS_DivisionNumber`  | TEXT    | Номер раздела/позиции по российскому классификатору (например, ГОСТ или СПДС). |
| `RUS_StartDatePlan`   | TEXT    | Плановая дата начала работ (формат: `YYYY-MM-DD` или произвольная строка). |
| `RUS_StartDateIs`     | TEXT    | Фактическая дата начала работ. |
| `RUS_EndDatePlan`     | TEXT    | Плановая дата завершения работ. |
| `RUS_EndDateIs`       | TEXT    | Фактическая дата завершения работ. |
